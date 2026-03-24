import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * Haversine distance between two coordinates in kilometers.
 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Sum haversine distances between consecutive positions.
 */
export function calculateTotalDistance(
  positions: { latitude: number; longitude: number }[]
): number {
  let total = 0
  for (let i = 1; i < positions.length; i++) {
    total += haversineKm(
      positions[i - 1].latitude,
      positions[i - 1].longitude,
      positions[i].latitude,
      positions[i].longitude
    )
  }
  return Math.round(total * 10) / 10
}

/**
 * Close an active trip: link positions, calculate summary stats, set end info.
 */
export async function closeTripWithSummary(
  supabase: SupabaseClient,
  tripId: string
) {
  const { data: trip } = await supabase
    .from("ceva_vehicle_trips")
    .select("ctrack_node_id, start_time")
    .eq("id", tripId)
    .single()

  if (!trip) return

  // Get all positions recorded during this trip's timeframe
  const { data: positions } = await supabase
    .from("ceva_vehicle_tracking_positions")
    .select("id, latitude, longitude, recorded_at, address")
    .eq("ctrack_node_id", trip.ctrack_node_id)
    .gte("recorded_at", trip.start_time)
    .order("recorded_at", { ascending: true })

  const posCount = positions?.length ?? 0
  const lastPos = positions?.[posCount - 1]
  const distanceKm = posCount > 1 ? calculateTotalDistance(positions!) : 0

  // Link all positions to this trip
  if (posCount > 0) {
    await supabase
      .from("ceva_vehicle_tracking_positions")
      .update({ trip_id: tripId })
      .eq("ctrack_node_id", trip.ctrack_node_id)
      .gte("recorded_at", trip.start_time)
      .lte("recorded_at", lastPos!.recorded_at)
  }

  // Close the trip with computed summary
  await supabase
    .from("ceva_vehicle_trips")
    .update({
      status: "completed",
      end_time: lastPos?.recorded_at ?? new Date().toISOString(),
      end_latitude: lastPos?.latitude ?? null,
      end_longitude: lastPos?.longitude ?? null,
      end_address: lastPos?.address ?? null,
      distance_km: distanceKm,
      position_count: posCount,
    })
    .eq("id", tripId)
}
