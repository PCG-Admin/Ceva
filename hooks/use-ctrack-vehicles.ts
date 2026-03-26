"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { TrackedVehicle, TrackedVehicleTrip } from "@/types/ctrack"

const POLL_INTERVAL_MS = 30_000
const USE_MOCK_DATA = true // Set to false to use real C1 tracking

// Mock vehicle data
const MOCK_VEHICLES: TrackedVehicle[] = [
  {
    nodeId: 101,
    registration: "KFL487NW",
    fleetNumber: "FLEET-001",
    description: "Volvo FH16 750HP",
    status: "moving",
    latitude: -26.1076,
    longitude: 27.9869,
    speed: 85,
    headingText: "NE",
    lastUpdate: new Date(Date.now() - 5 * 60000).toISOString(),
    address: "N1, Halfway House, Midrand",
    ignition: true,
    streetMaxSpeed: 120,
    statusText: "Moving",
    runningOdo: 125430,
  },
  {
    nodeId: 102,
    registration: "CY987654",
    fleetNumber: "FLEET-002",
    description: "Scania R500",
    status: "idle",
    latitude: -25.7479,
    longitude: 28.2293,
    speed: 0,
    headingText: "S",
    lastUpdate: new Date(Date.now() - 15 * 60000).toISOString(),
    address: "Rosslyn, Pretoria",
    ignition: true,
    streetMaxSpeed: 60,
    statusText: "Idle",
    runningOdo: 98765,
  },
  {
    nodeId: 103,
    registration: "GP123ABC",
    fleetNumber: "FLEET-003",
    description: "MAN TGX 640",
    status: "stopped",
    latitude: -29.8587,
    longitude: 31.0218,
    speed: 0,
    headingText: "E",
    lastUpdate: new Date(Date.now() - 120 * 60000).toISOString(),
    address: "Durban Harbour, KwaZulu-Natal",
    ignition: false,
    streetMaxSpeed: null,
    statusText: "Stopped",
    runningOdo: 87234,
  },
  {
    nodeId: 104,
    registration: "ND789XYZ",
    fleetNumber: "FLEET-004",
    description: "Mercedes-Benz Actros",
    status: "moving",
    latitude: -33.9249,
    longitude: 18.4241,
    speed: 60,
    headingText: "W",
    lastUpdate: new Date(Date.now() - 2 * 60000).toISOString(),
    address: "Cape Town CBD, Western Cape",
    ignition: true,
    streetMaxSpeed: 80,
    statusText: "Moving",
    runningOdo: 145678,
  },
  {
    nodeId: 105,
    registration: "FS456DEF",
    fleetNumber: "FLEET-005",
    description: "Iveco Stralis",
    status: "moving",
    latitude: -26.2041,
    longitude: 28.0473,
    speed: 95,
    headingText: "N",
    lastUpdate: new Date(Date.now() - 1 * 60000).toISOString(),
    address: "Johannesburg CBD, Gauteng",
    ignition: true,
    streetMaxSpeed: 120,
    statusText: "Moving",
    runningOdo: 112890,
  },
]

interface UseCtrackVehiclesReturn {
  vehicles: TrackedVehicle[]
  isLoading: boolean
  isRefreshing: boolean
  error: string | null
  lastFetched: string | null
  refresh: () => Promise<void>
}

export function useCtrackVehicles(): UseCtrackVehiclesReturn {
  const [vehicles, setVehicles] = useState<TrackedVehicle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFetched, setLastFetched] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchVehicles = useCallback(async (isInitial: boolean = false) => {
    try {
      if (isInitial) {
        setIsLoading(true)
      } else {
        setIsRefreshing(true)
      }
      setError(null)

      if (USE_MOCK_DATA) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500))
        setVehicles(MOCK_VEHICLES)
        setLastFetched(new Date().toISOString())
      } else {
        const response = await fetch("/api/ctrack/vehicles")
        const data = await response.json()

        if (!response.ok || data.error) {
          throw new Error(data.error || "Failed to fetch vehicles")
        }

        setVehicles(data.vehicles)
        setLastFetched(data.lastFetched)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error"
      setError(message)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchVehicles(true)
  }, [fetchVehicles])

  // Auto-poll every 30 seconds
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchVehicles(false)
    }, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchVehicles])

  // Manual refresh resets the poll timer
  const refresh = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    await fetchVehicles(false)
    intervalRef.current = setInterval(() => {
      fetchVehicles(false)
    }, POLL_INTERVAL_MS)
  }, [fetchVehicles])

  return { vehicles, isLoading, isRefreshing, error, lastFetched, refresh }
}

// ---- Trip history hook ----

// Mock trip data
const MOCK_TRIPS: TrackedVehicleTrip[] = [
  {
    nodeId: 101,
    startTime: new Date(Date.now() - 2 * 3600000).toISOString(),
    endTime: new Date(Date.now() - 1 * 3600000).toISOString(),
    tripOdo: 85000, // meters
    maxSpeed: 110,
    driverName: "John Smith",
  },
  {
    nodeId: 101,
    startTime: new Date(Date.now() - 24 * 3600000).toISOString(),
    endTime: new Date(Date.now() - 22 * 3600000).toISOString(),
    tripOdo: 124000,
    maxSpeed: 105,
    driverName: "John Smith",
  },
  {
    nodeId: 101,
    startTime: new Date(Date.now() - 48 * 3600000).toISOString(),
    endTime: new Date(Date.now() - 46 * 3600000).toISOString(),
    tripOdo: 67000,
    maxSpeed: 95,
    driverName: "Jane Doe",
  },
]

interface UseCtrackTripsReturn {
  trips: TrackedVehicleTrip[]
  isLoading: boolean
  error: string | null
}

export function useCtrackTrips(
  vehicleNodeId: number | null
): UseCtrackTripsReturn {
  const [trips, setTrips] = useState<TrackedVehicleTrip[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!vehicleNodeId) {
      setTrips([])
      return
    }

    let cancelled = false

    async function fetchTrips() {
      setIsLoading(true)
      setError(null)
      try {
        if (USE_MOCK_DATA) {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, 300))
          if (!cancelled) {
            setTrips(MOCK_TRIPS.filter(t => t.nodeId === vehicleNodeId))
          }
        } else {
          const response = await fetch(
            `/api/ctrack/trips?vehicleNodeId=${vehicleNodeId}`
          )
          const data = await response.json()

          if (!cancelled) {
            if (!response.ok || data.error) {
              throw new Error(data.error || "Failed to fetch trips")
            }
            setTrips(data.trips)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error")
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    fetchTrips()
    return () => {
      cancelled = true
    }
  }, [vehicleNodeId])

  return { trips, isLoading, error }
}
