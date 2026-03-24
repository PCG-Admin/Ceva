import { NextResponse } from "next/server"
import {
  getVehicles,
  getLastPositions,
  mergeVehiclesWithPositions,
} from "@/lib/ctrack/service"
import type { CtrackVehiclesApiResponse } from "@/types/ctrack"

export async function GET() {
  try {
    const [vehicles, positions] = await Promise.all([
      getVehicles(),
      getLastPositions(),
    ])

    const merged = mergeVehiclesWithPositions(vehicles, positions)

    const response: CtrackVehiclesApiResponse = {
      vehicles: merged,
      lastFetched: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Ctrack vehicles API error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch vehicles"
    return NextResponse.json(
      { vehicles: [], lastFetched: new Date().toISOString(), error: message },
      { status: 500 }
    )
  }
}
