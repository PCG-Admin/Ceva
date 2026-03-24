"use client"

import { Polyline, Marker } from "@react-google-maps/api"
import type { VehicleTrackingPosition } from "@/types/tracking"

interface TripRoutePolylineProps {
  positions: VehicleTrackingPosition[]
  color?: string
  weight?: number
}

export function TripRoutePolyline({
  positions,
  color = "#2563eb",
  weight = 4,
}: TripRoutePolylineProps) {
  if (positions.length < 2) return null

  const path = positions.map((p) => ({
    lat: p.latitude,
    lng: p.longitude,
  }))

  const startPos = positions[0]
  const endPos = positions[positions.length - 1]

  return (
    <>
      <Polyline
        path={path}
        options={{
          strokeColor: color,
          strokeWeight: weight,
          strokeOpacity: 0.8,
          geodesic: true,
        }}
      />
      {/* Start marker (green circle) */}
      <Marker
        position={{ lat: startPos.latitude, lng: startPos.longitude }}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#22c55e",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }}
        title={`Trip start: ${new Date(startPos.recorded_at).toLocaleString()}`}
      />
      {/* End marker (red circle) */}
      <Marker
        position={{ lat: endPos.latitude, lng: endPos.longitude }}
        icon={{
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#ef4444",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }}
        title={`Trip end: ${new Date(endPos.recorded_at).toLocaleString()}`}
      />
    </>
  )
}
