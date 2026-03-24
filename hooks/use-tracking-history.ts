"use client"

import { useState, useEffect } from "react"
import type { VehicleTrip, VehicleTrackingPosition } from "@/types/tracking"

interface UseTrackingHistoryReturn {
  trips: VehicleTrip[]
  isLoading: boolean
  error: string | null
}

export function useTrackingHistory(
  horseId: string | null,
  dateRange?: { from: string; to: string }
): UseTrackingHistoryReturn {
  const [trips, setTrips] = useState<VehicleTrip[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!horseId) {
      setTrips([])
      return
    }

    let cancelled = false

    async function fetchTrips() {
      setIsLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({ horseId: horseId! })
        if (dateRange?.from) params.set("from", dateRange.from)
        if (dateRange?.to) params.set("to", dateRange.to)

        const res = await fetch(`/api/tracking-history?${params}`)
        const data = await res.json()

        if (!cancelled) {
          if (data.error) throw new Error(data.error)
          setTrips(data.trips)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error")
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchTrips()
    return () => {
      cancelled = true
    }
  }, [horseId, dateRange?.from, dateRange?.to])

  return { trips, isLoading, error }
}

interface UseTripPositionsReturn {
  positions: VehicleTrackingPosition[]
  isLoading: boolean
}

export function useTripPositions(
  tripId: string | null
): UseTripPositionsReturn {
  const [positions, setPositions] = useState<VehicleTrackingPosition[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!tripId) {
      setPositions([])
      return
    }

    let cancelled = false

    setPositions([])
    async function fetchPositions() {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/tracking-history?tripId=${tripId}`)
        const data = await res.json()
        if (!cancelled) setPositions(data.positions ?? [])
      } catch {
        // Silently fail for positions
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchPositions()
    return () => {
      cancelled = true
    }
  }, [tripId])

  return { positions, isLoading }
}
