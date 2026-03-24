"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { TrackedVehicle, TrackedVehicleTrip } from "@/types/ctrack"

const POLL_INTERVAL_MS = 30_000

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

      const response = await fetch("/api/ctrack/vehicles")
      const data = await response.json()

      if (!response.ok || data.error) {
        throw new Error(data.error || "Failed to fetch vehicles")
      }

      setVehicles(data.vehicles)
      setLastFetched(data.lastFetched)
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
