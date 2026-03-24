import { NextResponse } from "next/server"
import { getVehicles } from "@/lib/ctrack/service"

export interface CtrackVehicleLookupItem {
  nodeId: number
  registration: string
  fleetNumber: string
  description: string
  vin: string | null
  serialNumber: string | null
  unitIMEI: string | null
}

export interface CtrackVehicleLookupResponse {
  vehicles: CtrackVehicleLookupItem[]
  error?: string
}

export async function GET() {
  try {
    const raw = await getVehicles()

    const vehicles: CtrackVehicleLookupItem[] = raw.map((v) => ({
      nodeId: v.NodeId,
      registration: v.VehicleRegistration,
      fleetNumber: v.FleetNumber,
      description: v.Description,
      vin: v.VIN ?? null,
      serialNumber: v.SerialNumber ?? null,
      unitIMEI: v.UnitIMEI ?? null,
    }))

    return NextResponse.json<CtrackVehicleLookupResponse>({ vehicles })
  } catch (error) {
    console.error("Ctrack vehicle lookup error:", error)
    const message =
      error instanceof Error ? error.message : "Failed to fetch vehicles"
    return NextResponse.json<CtrackVehicleLookupResponse>(
      { vehicles: [], error: message },
      { status: 500 }
    )
  }
}
