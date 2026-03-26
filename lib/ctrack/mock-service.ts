/**
 * Mock CTrack Service
 * Provides simulated GPS tracking data when CTrack API is not available
 * This allows the app to work in development/testing without real CTrack credentials
 */

import type {
  CtrackVehicleRaw,
  CtrackVehiclePositionRaw,
  TrackedVehicle,
  TrackedVehicleStatus,
  TrackedVehicleTrip,
} from "@/types/ctrack"

// Mock vehicles data
export const MOCK_VEHICLES: CtrackVehicleRaw[] = [
  {
    NodeId: 12345,
    VehicleRegistration: "JY55ZSGP",
    FleetNumber: "MACHETE-001",
    Description: "Mercedes-Benz Actros - MACHETE Transport",
    LastTime: new Date().toISOString(),
  },
  {
    NodeId: 12346,
    VehicleRegistration: "LB72VDGP",
    FleetNumber: "PHU2MA-001",
    Description: "Scania R500 - PHU2MA Transport",
    LastTime: new Date().toISOString(),
  },
  {
    NodeId: 12347,
    VehicleRegistration: "JZ69SSGP",
    FleetNumber: "CAG-001",
    Description: "Volvo FH16 - CAG Transport",
    LastTime: new Date().toISOString(),
  },
  {
    NodeId: 12348,
    VehicleRegistration: "AFJ5603",
    FleetNumber: "LIMGOS-001",
    Description: "MAN TGX - LIMGOS Transport",
    LastTime: new Date().toISOString(),
  },
]

// Mock GPS positions - simulating vehicles at different locations
export const MOCK_POSITIONS: CtrackVehiclePositionRaw[] = [
  {
    NodeId: 12345,
    Latitude: -25.7479,
    Longitude: 28.2293,
    Speed: 65.5,
    HeadingText: "NE",
    Ignition: true,
    Location: "N1 Highway, Polokwane, Limpopo",
    StatusText: "Moving",
    StreetMaxSpeed: 120,
    EventTimeUTC: new Date().toISOString(),
    RunningOdo: 125430.5,
  },
  {
    NodeId: 12346,
    Latitude: -22.0122,
    Longitude: 30.4314,
    Speed: 0,
    HeadingText: "N",
    Ignition: false,
    Location: "Beitbridge Border Post, Zimbabwe",
    StatusText: "Stopped",
    StreetMaxSpeed: 60,
    EventTimeUTC: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
    RunningOdo: 98754.2,
  },
  {
    NodeId: 12347,
    Latitude: -29.8587,
    Longitude: 31.0218,
    Speed: 45.0,
    HeadingText: "SE",
    Ignition: true,
    Location: "N3 Highway, Durban, KZN",
    StatusText: "Moving",
    StreetMaxSpeed: 120,
    EventTimeUTC: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
    RunningOdo: 156789.8,
  },
  {
    NodeId: 12348,
    Latitude: -18.9925,
    Longitude: 32.6474,
    Speed: 0,
    HeadingText: "E",
    Ignition: true,
    Location: "Nottingham Estate, Mazowe, Zimbabwe",
    StatusText: "Idle",
    StreetMaxSpeed: 40,
    EventTimeUTC: new Date(Date.now() - 10 * 60000).toISOString(), // 10 min ago
    RunningOdo: 87345.1,
  },
]

// Mock trips data
export const MOCK_TRIPS: TrackedVehicleTrip[] = [
  {
    nodeId: 12345,
    startTime: new Date(Date.now() - 8 * 3600000).toISOString(), // 8 hours ago
    endTime: new Date(Date.now() - 1 * 3600000).toISOString(), // 1 hour ago
    tripOdo: 450.5,
    maxSpeed: 95.2,
    driverName: "Givemore Muzanenhamo",
  },
  {
    nodeId: 12345,
    startTime: new Date(Date.now() - 24 * 3600000).toISOString(), // 24 hours ago
    endTime: new Date(Date.now() - 16 * 3600000).toISOString(), // 16 hours ago
    tripOdo: 380.2,
    maxSpeed: 89.5,
    driverName: "Givemore Muzanenhamo",
  },
  {
    nodeId: 12346,
    startTime: new Date(Date.now() - 12 * 3600000).toISOString(),
    endTime: new Date(Date.now() - 6 * 3600000).toISOString(),
    tripOdo: 520.8,
    maxSpeed: 102.3,
    driverName: "Edmond Yayedza Mashayamombe",
  },
]

/**
 * Get mock vehicles list
 */
export function getMockVehicles(): CtrackVehicleRaw[] {
  return MOCK_VEHICLES
}

/**
 * Get mock GPS positions
 */
export function getMockPositions(nodeIds?: number[]): CtrackVehiclePositionRaw[] {
  if (!nodeIds || nodeIds.length === 0) {
    return MOCK_POSITIONS
  }
  return MOCK_POSITIONS.filter((pos) => nodeIds.includes(pos.NodeId))
}

/**
 * Get mock trips for a vehicle
 */
export function getMockTrips(
  vehicleNodeId: number,
  fromDateTimeUTC?: string,
  toDateTimeUTC?: string
): TrackedVehicleTrip[] {
  return MOCK_TRIPS.filter((trip) => trip.nodeId === vehicleNodeId)
}

/**
 * Derive vehicle status from position
 */
function deriveStatus(position: CtrackVehiclePositionRaw | undefined): TrackedVehicleStatus {
  if (!position) return "no-data"
  if (position.Speed > 0) return "moving"
  if (position.Ignition) return "idle"
  return "stopped"
}

/**
 * Merge vehicles with their positions into TrackedVehicle format
 */
export function mergeMockVehiclesWithPositions(
  vehicles: CtrackVehicleRaw[] = MOCK_VEHICLES,
  positions: CtrackVehiclePositionRaw[] = MOCK_POSITIONS
): TrackedVehicle[] {
  const positionMap = new Map<number, CtrackVehiclePositionRaw>()
  for (const pos of positions) {
    positionMap.set(pos.NodeId, pos)
  }

  return vehicles.map((vehicle) => {
    const position = positionMap.get(vehicle.NodeId)
    return {
      nodeId: vehicle.NodeId,
      registration: vehicle.VehicleRegistration,
      fleetNumber: vehicle.FleetNumber,
      description: vehicle.Description,
      status: deriveStatus(position),
      latitude: position?.Latitude ?? null,
      longitude: position?.Longitude ?? null,
      speed: position?.Speed ?? null,
      headingText: position?.HeadingText ?? null,
      ignition: position?.Ignition ?? null,
      address: position?.Location?.trim() ?? null,
      statusText: position?.StatusText ?? null,
      streetMaxSpeed: position?.StreetMaxSpeed ?? null,
      lastUpdate: position?.EventTimeUTC ?? vehicle.LastTime ?? null,
      runningOdo: position?.RunningOdo ?? null,
    }
  })
}

/**
 * Check if CTrack is configured
 */
export function isCtrackConfigured(): boolean {
  const apiUrl = process.env.CTRACK_API_URL
  const username = process.env.CTRACK_USERNAME
  const password = process.env.CTRACK_PASSWORD

  return !!(apiUrl && username && password && username.trim() !== "" && password.trim() !== "")
}

/**
 * Generate random position update (for simulating movement)
 */
export function updateMockPositions(): CtrackVehiclePositionRaw[] {
  return MOCK_POSITIONS.map((pos) => {
    if (pos.Speed > 0) {
      // Simulate movement by slightly changing lat/lng
      const latChange = (Math.random() - 0.5) * 0.001 // Small change
      const lngChange = (Math.random() - 0.5) * 0.001
      const speedChange = (Math.random() - 0.5) * 5 // +/- 2.5 km/h

      return {
        ...pos,
        Latitude: pos.Latitude + latChange,
        Longitude: pos.Longitude + lngChange,
        Speed: Math.max(0, pos.Speed + speedChange),
        EventTimeUTC: new Date().toISOString(),
        RunningOdo: (pos.RunningOdo ?? 0) + Math.random() * 0.5,
      }
    }
    return pos
  })
}
