import type {
  CtrackLoginResponse,
  CtrackGetVehiclesResponse,
  CtrackGetPositionsResponse,
  CtrackGetTripsResponse,
  CtrackVehicleRaw,
  CtrackVehiclePositionRaw,
  TrackedVehicle,
  TrackedVehicleStatus,
  TrackedVehicleTrip,
} from "@/types/ctrack"

import {
  isCtrackConfigured,
  getMockVehicles,
  getMockPositions,
  getMockTrips,
  mergeMockVehiclesWithPositions,
} from "./mock-service"

// ---- Configuration ----

function getConfig() {
  const apiUrl = process.env.CTRACK_API_URL
  const username = process.env.CTRACK_USERNAME
  const password = process.env.CTRACK_PASSWORD

  if (!apiUrl || !username || !password || username.trim() === "" || password.trim() === "") {
    throw new Error(
      "Ctrack API configuration missing. Set CTRACK_API_URL, CTRACK_USERNAME, and CTRACK_PASSWORD in .env.local"
    )
  }

  return { apiUrl, username, password }
}

// Check if we should use mock data
function shouldUseMock(): boolean {
  return !isCtrackConfigured()
}

// ---- Token cache (module-level singleton) ----

let cachedToken: string | null = null
let tokenExpiresAt: number = 0
const TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

async function getSessionToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken
  }

  const { apiUrl, username, password } = getConfig()
  const loginUrl = `${apiUrl}/REST/Membership/Login?username=${encodeURIComponent(username)}&Password=${encodeURIComponent(password)}`

  const response = await fetch(loginUrl, {
    method: "GET",
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Ctrack login failed with HTTP ${response.status}`)
  }

  const data: CtrackLoginResponse = await response.json()

  if (data.ErrorCode !== 0) {
    throw new Error(`Ctrack login error: ErrorCode ${data.ErrorCode}`)
  }

  cachedToken = data.SessionToken
  tokenExpiresAt = Date.now() + TOKEN_TTL_MS

  return data.SessionToken
}

function invalidateToken(): void {
  cachedToken = null
  tokenExpiresAt = 0
}

// ---- API call helper with automatic retry on auth failure ----

async function ctrackFetch<T extends { ErrorCode: number }>(
  buildUrl: (token: string) => string
): Promise<T> {
  let token = await getSessionToken()
  let response = await fetch(buildUrl(token), {
    method: "GET",
    cache: "no-store",
  })

  let data: T

  // Only retry on auth errors (401 or ErrorCode 1), not on other failures
  if (response.status === 401) {
    invalidateToken()
    token = await getSessionToken()
    response = await fetch(buildUrl(token), {
      method: "GET",
      cache: "no-store",
    })
  }

  if (!response.ok) {
    throw new Error(`Ctrack API request failed with HTTP ${response.status}`)
  }

  data = await response.json()

  // Check for auth error in response body and retry once
  if (data.ErrorCode === 1) {
    invalidateToken()
    token = await getSessionToken()
    response = await fetch(buildUrl(token), {
      method: "GET",
      cache: "no-store",
    })
    if (!response.ok) {
      throw new Error(`Ctrack API request failed with HTTP ${response.status}`)
    }
    data = await response.json()
  }

  if (data.ErrorCode !== 0) {
    throw new Error(`Ctrack API error: ErrorCode ${data.ErrorCode}`)
  }

  return data
}

// ---- Public API methods ----

export async function getVehicles(): Promise<CtrackVehicleRaw[]> {
  // Use mock data if CTrack is not configured
  if (shouldUseMock()) {
    console.log("[CTrack] Using mock vehicle data (CTrack not configured)")
    return getMockVehicles()
  }

  try {
    const data = await ctrackFetch<CtrackGetVehiclesResponse>(
      (token) => `${getConfig().apiUrl}/REST/Vehicles/${token}/GetVehicles`
    )
    return data.VehicleList
  } catch (error) {
    console.error("[CTrack] Failed to fetch vehicles, falling back to mock data:", error)
    return getMockVehicles()
  }
}

export async function getLastPositions(
  nodeIds?: number[]
): Promise<CtrackVehiclePositionRaw[]> {
  // Use mock data if CTrack is not configured
  if (shouldUseMock()) {
    console.log("[CTrack] Using mock position data (CTrack not configured)")
    return getMockPositions(nodeIds)
  }

  try {
    let ids = nodeIds
    if (!ids || ids.length === 0) {
      const vehicles = await getVehicles()
      ids = vehicles.map((v) => v.NodeId)
    }

    const idsParam = ids.join(",")
    const data = await ctrackFetch<CtrackGetPositionsResponse>(
      (token) =>
        `${getConfig().apiUrl}/REST/Vehicles/${token}/GetLastVehiclePositions?svehicleNodeIds=${idsParam}`
    )
    return data.LastVehiclePositions ?? []
  } catch (error) {
    console.error("[CTrack] Failed to fetch positions, falling back to mock data:", error)
    return getMockPositions(nodeIds)
  }
}

export async function getVehicleTrips(
  vehicleNodeId: number,
  fromDateTimeUTC: string,
  toDateTimeUTC: string
): Promise<CtrackGetTripsResponse> {
  // Use mock data if CTrack is not configured
  if (shouldUseMock()) {
    console.log("[CTrack] Using mock trips data (CTrack not configured)")
    const trips = getMockTrips(vehicleNodeId, fromDateTimeUTC, toDateTimeUTC)
    return {
      ErrorCode: 0,
      VehicleTrips: trips.map((t) => ({
        NodeId: t.nodeId,
        TripStartUTC: t.startTime,
        TripEndUTC: t.endTime,
        TripOdo: t.tripOdo,
        MaxSpeed: t.maxSpeed,
        Tag: "",
        DriverName: t.driverName || "",
        DriverId: "",
      })),
    }
  }

  try {
    return await ctrackFetch<CtrackGetTripsResponse>(
      (token) =>
        `${getConfig().apiUrl}/REST/Vehicles/${token}/GetVehicleTrips?vehicleNodeId=${vehicleNodeId}&fromDateTimeUTC=${fromDateTimeUTC}&toDateTimeUTC=${toDateTimeUTC}`
    )
  } catch (error) {
    console.error("[CTrack] Failed to fetch trips, falling back to mock data:", error)
    const trips = getMockTrips(vehicleNodeId, fromDateTimeUTC, toDateTimeUTC)
    return {
      ErrorCode: 0,
      VehicleTrips: trips.map((t) => ({
        NodeId: t.nodeId,
        TripStartUTC: t.startTime,
        TripEndUTC: t.endTime,
        TripOdo: t.tripOdo,
        MaxSpeed: t.maxSpeed,
        Tag: "",
        DriverName: t.driverName || "",
        DriverId: "",
      })),
    }
  }
}

// ---- Normalization ----

function deriveStatus(
  position: CtrackVehiclePositionRaw | undefined
): TrackedVehicleStatus {
  if (!position) return "no-data"
  if (position.Speed > 0) return "moving"
  if (position.Ignition) return "idle"
  return "stopped"
}

export function mergeVehiclesWithPositions(
  vehicles: CtrackVehicleRaw[],
  positions: CtrackVehiclePositionRaw[]
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

export function normalizeTrips(
  trips: CtrackGetTripsResponse
): TrackedVehicleTrip[] {
  return (trips.VehicleTrips ?? []).map((trip) => ({
    nodeId: trip.NodeId,
    startTime: trip.TripStartUTC,
    endTime: trip.TripEndUTC,
    tripOdo: trip.TripOdo,
    maxSpeed: trip.MaxSpeed,
    driverName: trip.DriverName || null,
  }))
}
