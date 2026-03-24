import { NextRequest, NextResponse } from "next/server"
import { getVehicleTrips, normalizeTrips } from "@/lib/ctrack/service"
import type { CtrackTripsApiResponse } from "@/types/ctrack"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const vehicleNodeId = searchParams.get("vehicleNodeId")
    const fromDateTimeUTC = searchParams.get("fromDateTimeUTC")
    const toDateTimeUTC = searchParams.get("toDateTimeUTC")

    if (!vehicleNodeId) {
      return NextResponse.json(
        { trips: [], error: "vehicleNodeId is required" },
        { status: 400 }
      )
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const from = fromDateTimeUTC ?? sevenDaysAgo.toISOString()
    const to = toDateTimeUTC ?? now.toISOString()

    const rawTrips = await getVehicleTrips(Number(vehicleNodeId), from, to)
    const trips = normalizeTrips(rawTrips).sort(
      (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    )

    const response: CtrackTripsApiResponse = { trips }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Ctrack trips API error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch trips"
    return NextResponse.json(
      { trips: [], error: message },
      { status: 500 }
    )
  }
}
