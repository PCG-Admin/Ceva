import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type {
  TrackingHistoryApiResponse,
  TripPositionsApiResponse,
} from "@/types/tracking"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  const tripId = searchParams.get("tripId")

  // Mode 1: Get positions for a specific trip
  if (tripId) {
    const { data: positions, error } = await supabase
      .from("ceva_vehicle_tracking_positions")
      .select(
        "id, horse_id, ctrack_node_id, trip_id, latitude, longitude, speed, heading, ignition, address, recorded_at"
      )
      .eq("trip_id", tripId)
      .order("recorded_at", { ascending: true })

    if (error) {
      return NextResponse.json(
        { positions: [], error: error.message } satisfies TripPositionsApiResponse,
        { status: 500 }
      )
    }

    return NextResponse.json({
      positions: positions ?? [],
    } satisfies TripPositionsApiResponse)
  }

  // Mode 2: Get trips for a vehicle in a date range
  const horseId = searchParams.get("horseId")
  if (!horseId) {
    return NextResponse.json(
      { trips: [], error: "horseId or tripId is required" },
      { status: 400 }
    )
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const from = searchParams.get("from") ?? sevenDaysAgo.toISOString()
  const to = searchParams.get("to") ?? now.toISOString()

  const { data: trips, error } = await supabase
    .from("ceva_vehicle_trips")
    .select("*")
    .eq("horse_id", horseId)
    .eq("status", "completed")
    .gte("start_time", from)
    .lte("start_time", to)
    .order("start_time", { ascending: false })

  if (error) {
    return NextResponse.json(
      { trips: [], error: error.message } satisfies TrackingHistoryApiResponse,
      { status: 500 }
    )
  }

  return NextResponse.json({
    trips: trips ?? [],
  } satisfies TrackingHistoryApiResponse)
}
