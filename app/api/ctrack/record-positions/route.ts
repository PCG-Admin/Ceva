import { NextRequest, NextResponse } from "next/server"
import { getVehicles, getLastPositions } from "@/lib/ctrack/service"
import { createAdminClient } from "@/lib/supabase/admin"
import { closeTripWithSummary, haversineKm } from "@/lib/tracking/utils"
import { geocodeAddress } from "@/lib/tracking/geocode"

export const maxDuration = 30
export const dynamic = "force-dynamic"

// Minutes with no new position before an active trip is auto-closed
const STALE_TRIP_MINUTES = 15

export async function GET(request: NextRequest) {
  // Authenticate: Vercel cron sends Authorization header, or use query param for manual testing
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const debug = request.nextUrl.searchParams.get("debug") === "true"
  const supabase = createAdminClient()

  try {
    // 1. Fetch vehicles + positions from Ctrack in parallel
    const [ctrackVehicles, positions] = await Promise.all([
      getVehicles(),
      getLastPositions(),
    ])

    // Build nodeId -> registration map from Ctrack (registrations may have name suffix e.g. "KFL487NW TATENDA")
    const nodeToRegistration = new Map<number, string>()
    for (const v of ctrackVehicles) {
      // Take only the plate segment (first word) to match our DB format
      const plate = v.VehicleRegistration.split(" ")[0]
      nodeToRegistration.set(v.NodeId, plate)
    }

    // 2. Load horse mapping — primary: tracking_unit_id, fallback: registration_number
    const { data: horses } = await supabase
      .from("ceva_horses")
      .select("id, tracking_unit_id, registration_number")

    const horseMap = new Map<number, string>() // nodeId -> horse UUID
    const regToHorseId = new Map<string, string>() // plate -> horse UUID

    for (const h of horses ?? []) {
      if (h.tracking_unit_id) {
        horseMap.set(Number(h.tracking_unit_id), h.id)
      }
      if (h.registration_number) {
        regToHorseId.set(h.registration_number.toUpperCase(), h.id)
      }
    }

    // Resolve nodeId -> horse UUID, using registration as fallback for unlinked horses
    function resolveHorseId(nodeId: number): string | undefined {
      const byId = horseMap.get(nodeId)
      if (byId) return byId
      const plate = nodeToRegistration.get(nodeId)
      if (plate) return regToHorseId.get(plate.toUpperCase())
      return undefined
    }

    // 3. Load active trips
    const { data: activeTrips } = await supabase
      .from("ceva_vehicle_trips")
      .select("id, ctrack_node_id, max_speed, start_time")
      .eq("status", "active")

    const activeTripMap = new Map<
      number,
      { id: string; max_speed: number; start_time: string }
    >()
    for (const t of activeTrips ?? []) {
      activeTripMap.set(t.ctrack_node_id, {
        id: t.id,
        max_speed: t.max_speed,
        start_time: t.start_time,
      })
    }

    // 4. Load latest recorded_at per vehicle for deduplication
    const nodeIds = positions
      .map((p) => p.NodeId)
      .filter((id) => resolveHorseId(id) !== undefined)

    const latestTimestamps = new Map<number, string>()
    if (nodeIds.length > 0) {
      // Get the most recent position for each tracked vehicle
      for (const nodeId of nodeIds) {
        const { data: latest } = await supabase
          .from("ceva_vehicle_tracking_positions")
          .select("recorded_at")
          .eq("ctrack_node_id", nodeId)
          .order("recorded_at", { ascending: false })
          .limit(1)
          .single()

        if (latest) {
          latestTimestamps.set(nodeId, latest.recorded_at)
        }
      }
    }

    // 5. Process each vehicle position
    const positionsToInsert: Array<{
      horse_id: string
      ctrack_node_id: number
      latitude: number
      longitude: number
      speed: number
      heading: string | null
      ignition: boolean
      address: string | null
      recorded_at: string
    }> = []
    const tripsToCreate: Array<{
      horse_id: string
      ctrack_node_id: number
      status: "active"
      start_time: string
      start_latitude: number
      start_longitude: number
      start_address: string | null
      max_speed: number
    }> = []
    const tripsToClose: string[] = []
    const tripsToUpdateMaxSpeed: Array<{ id: string; max_speed: number }> = []

    for (const pos of positions) {
      const horseId = resolveHorseId(pos.NodeId)
      if (!horseId) continue // vehicle not in our system

      // Skip if this exact timestamp was already recorded (normalize formats before comparing)
      const lastRecorded = latestTimestamps.get(pos.NodeId)
      if (lastRecorded && new Date(lastRecorded).getTime() === new Date(pos.EventTimeUTC).getTime()) continue

      const isMoving = pos.Speed > 0
      const activeTrip = activeTripMap.get(pos.NodeId)

      if (isMoving) {
        // Record position for moving vehicles
        positionsToInsert.push({
          horse_id: horseId,
          ctrack_node_id: pos.NodeId,
          latitude: pos.Latitude,
          longitude: pos.Longitude,
          speed: pos.Speed,
          heading: pos.HeadingText || null,
          ignition: pos.Ignition,
          address: pos.Location?.trim() || null,
          recorded_at: pos.EventTimeUTC,
        })

        if (!activeTrip) {
          // TRANSITION: stopped -> moving = NEW TRIP
          tripsToCreate.push({
            horse_id: horseId,
            ctrack_node_id: pos.NodeId,
            status: "active",
            start_time: pos.EventTimeUTC,
            start_latitude: pos.Latitude,
            start_longitude: pos.Longitude,
            start_address: pos.Location?.trim() || null,
            max_speed: pos.Speed,
          })
        } else if (pos.Speed > activeTrip.max_speed) {
          tripsToUpdateMaxSpeed.push({
            id: activeTrip.id,
            max_speed: pos.Speed,
          })
        }
      } else if (!isMoving && !pos.Ignition && activeTrip) {
        // TRANSITION: moving -> stopped (ignition off) = CLOSE TRIP
        // Insert one final position at the stop location
        positionsToInsert.push({
          horse_id: horseId,
          ctrack_node_id: pos.NodeId,
          latitude: pos.Latitude,
          longitude: pos.Longitude,
          speed: 0,
          heading: pos.HeadingText || null,
          ignition: false,
          address: pos.Location?.trim() || null,
          recorded_at: pos.EventTimeUTC,
        })
        tripsToClose.push(activeTrip.id)
      }
      // else: stopped + no active trip OR idle with active trip = skip
    }

    // 6. Check for stale active trips (no position in 15+ min, vehicle not currently moving)
    const now = new Date()
    for (const [nodeId, trip] of activeTripMap) {
      // Skip if we're already closing this trip
      if (tripsToClose.includes(trip.id)) continue

      // Skip if we just recorded a position for this vehicle (it's still moving)
      if (positionsToInsert.some((p) => p.ctrack_node_id === nodeId)) continue

      // Check if the last recorded position is older than threshold
      const lastTs = latestTimestamps.get(nodeId)
      if (lastTs) {
        const lastTime = new Date(lastTs)
        const minutesAgo = (now.getTime() - lastTime.getTime()) / 60000
        if (minutesAgo > STALE_TRIP_MINUTES) {
          tripsToClose.push(trip.id)
        }
      }
    }

    // 7. Execute batch operations
    if (positionsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("ceva_vehicle_tracking_positions")
        .insert(positionsToInsert)

      if (insertError) {
        console.error("Position insert error:", insertError)
      }
    }

    for (const trip of tripsToCreate) {
      const { error: tripError } = await supabase
        .from("ceva_vehicle_trips")
        .insert(trip)

      if (tripError) {
        console.error("Trip create error:", tripError)
      }
    }

    for (const tripId of tripsToClose) {
      await closeTripWithSummary(supabase, tripId)
    }

    for (const { id, max_speed } of tripsToUpdateMaxSpeed) {
      await supabase
        .from("ceva_vehicle_trips")
        .update({ max_speed })
        .eq("id", id)
    }

    // 8. Geofence checks — only when positions were recorded this tick
    let geofenceEventsFired = 0
    if (positionsToInsert.length > 0) {
      try {
        const activeHorseIds = [...new Set(positionsToInsert.map((p) => p.horse_id))]

        const { data: activeLoads } = await supabase
          .from("ceva_loads")
          .select("id, horse_id, origin, destination, origin_lat, origin_lng, dest_lat, dest_lng")
          .in("status", ["assigned", "in-transit"])
          .in("horse_id", activeHorseIds)

        if (activeLoads?.length) {
          // Load already-fired events
          const { data: firedEvents } = await supabase
            .from("ceva_load_geofence_events")
            .select("load_id, event_type")
            .in("load_id", activeLoads.map((l) => l.id))

          const fired = new Set(firedEvents?.map((e) => `${e.load_id}:${e.event_type}`) ?? [])

          // Lazy geocode loads with missing coordinates (max 5 per tick to stay within maxDuration)
          for (const load of activeLoads.filter((l) => !l.origin_lat || !l.dest_lat).slice(0, 5)) {
            const updates: Record<string, number | null> = {}
            if (!load.origin_lat || !load.origin_lng) {
              const c = await geocodeAddress(load.origin)
              if (c) {
                updates.origin_lat = c.lat
                updates.origin_lng = c.lng
                load.origin_lat = c.lat
                load.origin_lng = c.lng
              }
            }
            if (!load.dest_lat || !load.dest_lng) {
              const c = await geocodeAddress(load.destination)
              if (c) {
                updates.dest_lat = c.lat
                updates.dest_lng = c.lng
                load.dest_lat = c.lat
                load.dest_lng = c.lng
              }
            }
            if (Object.keys(updates).length) {
              await supabase.from("ceva_loads").update(updates).eq("id", load.id)
            }
          }

          // Latest position per horse this tick
          const latestPos = new Map<string, (typeof positionsToInsert)[0]>()
          for (const p of positionsToInsert) latestPos.set(p.horse_id, p)

          const geofenceEvents: Array<{
            load_id: string
            horse_id: string
            event_type: string
            latitude: number
            longitude: number
            occurred_at: string
          }> = []
          const RADIUS_KM = 0.1

          for (const load of activeLoads) {
            if (!load.origin_lat || !load.origin_lng || !load.dest_lat || !load.dest_lng) continue
            const pos = latestPos.get(load.horse_id)
            if (!pos) continue

            const dOrigin = haversineKm(pos.latitude, pos.longitude, load.origin_lat, load.origin_lng)
            const dDest = haversineKm(pos.latitude, pos.longitude, load.dest_lat, load.dest_lng)
            const ev = (type: string) => fired.has(`${load.id}:${type}`)

            if (!ev("arrived_pickup") && dOrigin <= RADIUS_KM)
              geofenceEvents.push({ load_id: load.id, horse_id: load.horse_id, event_type: "arrived_pickup", latitude: pos.latitude, longitude: pos.longitude, occurred_at: pos.recorded_at })
            if (ev("arrived_pickup") && !ev("left_pickup") && dOrigin > RADIUS_KM)
              geofenceEvents.push({ load_id: load.id, horse_id: load.horse_id, event_type: "left_pickup", latitude: pos.latitude, longitude: pos.longitude, occurred_at: pos.recorded_at })
            if (!ev("arrived_destination") && dDest <= RADIUS_KM)
              geofenceEvents.push({ load_id: load.id, horse_id: load.horse_id, event_type: "arrived_destination", latitude: pos.latitude, longitude: pos.longitude, occurred_at: pos.recorded_at })
            if (ev("arrived_destination") && !ev("left_destination") && dDest > RADIUS_KM)
              geofenceEvents.push({ load_id: load.id, horse_id: load.horse_id, event_type: "left_destination", latitude: pos.latitude, longitude: pos.longitude, occurred_at: pos.recorded_at })
          }

          if (geofenceEvents.length > 0) {
            await supabase
              .from("ceva_load_geofence_events")
              .upsert(geofenceEvents, { onConflict: "load_id,event_type", ignoreDuplicates: true })
            geofenceEventsFired = geofenceEvents.length
          }
        }
      } catch (err) {
        console.error("Geofencing step error:", err) // never crash the cron
      }
    }

    const summary = {
      ok: true,
      positions_recorded: positionsToInsert.length,
      trips_created: tripsToCreate.length,
      trips_closed: tripsToClose.length,
      geofence_events_fired: geofenceEventsFired,
    }

    if (!debug) return NextResponse.json(summary)

    return NextResponse.json({
      ...summary,
      debug: {
        ctrack_vehicles_found: ctrackVehicles.length,
        ctrack_positions_returned: positions.length,
        db_horses_total: (horses ?? []).length,
        db_horses_with_tracking_unit_id: (horses ?? []).filter((h) => h.tracking_unit_id).length,
        db_horses_with_registration: (horses ?? []).filter((h) => h.registration_number).length,
        positions_matched_to_horses: nodeIds.length,
        vehicles_currently_moving: positions.filter((p) => p.Speed > 0).length,
        vehicles_currently_stopped: positions.filter((p) => p.Speed === 0).length,
        ctrack_vehicles: ctrackVehicles.map((v) => ({
          nodeId: v.NodeId,
          registration: v.VehicleRegistration,
          matched_horse_id: resolveHorseId(v.NodeId) ?? null,
          match_method: horseMap.has(v.NodeId)
            ? "tracking_unit_id"
            : resolveHorseId(v.NodeId)
            ? "registration"
            : "no_match",
        })),
        positions: positions.map((p) => ({
          nodeId: p.NodeId,
          speed: p.Speed,
          ignition: p.Ignition,
          eventTime: p.EventTimeUTC,
          horse_id: resolveHorseId(p.NodeId) ?? null,
          skipped_duplicate: latestTimestamps.has(p.NodeId)
            ? new Date(latestTimestamps.get(p.NodeId)!).getTime() === new Date(p.EventTimeUTC).getTime()
            : false,
        })),
      },
    })
  } catch (error) {
    console.error("Record positions error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
