"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GoogleMap, Marker, InfoWindow, DirectionsRenderer } from "@react-google-maps/api"
import type { TrackedVehicle } from "@/types/ctrack"
import type { VehicleTrackingPosition } from "@/types/tracking"

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "100%",
}

// Default center: South Africa
const DEFAULT_CENTER = { lat: -26.2041, lng: 28.0473 }
const DEFAULT_ZOOM = 6

const STATUS_COLORS: Record<string, string> = {
  moving: "#22c55e",
  idle: "#eab308",
  stopped: "#6b7280",
  "no-data": "#ef4444",
}

interface VehicleMapProps {
  vehicles: TrackedVehicle[]
  selectedVehicle: TrackedVehicle | null
  onVehicleSelect: (vehicle: TrackedVehicle) => void
  directions?: google.maps.DirectionsResult | null
  tripPositions?: VehicleTrackingPosition[]
  children?: React.ReactNode
}

export function VehicleMap({ vehicles, selectedVehicle, onVehicleSelect, directions, tripPositions, children }: VehicleMapProps) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [infoVehicle, setInfoVehicle] = useState<TrackedVehicle | null>(null)

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    setMapLoaded(true)
  }, [])

  // Fit bounds to show all vehicles when vehicles first load
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || vehicles.length === 0) return
    if (typeof google === "undefined") return

    const vehiclesWithPosition = vehicles.filter(
      (v) => v.latitude !== null && v.longitude !== null
    )
    if (vehiclesWithPosition.length === 0) return

    if (vehiclesWithPosition.length === 1) {
      mapRef.current.setCenter({
        lat: vehiclesWithPosition[0].latitude!,
        lng: vehiclesWithPosition[0].longitude!,
      })
      mapRef.current.setZoom(12)
      return
    }

    const bounds = new google.maps.LatLngBounds()
    vehiclesWithPosition.forEach((v) => {
      bounds.extend({ lat: v.latitude!, lng: v.longitude! })
    })
    mapRef.current.fitBounds(bounds, 50)
  }, [vehicles.length, mapLoaded]) // Only on initial load, not every poll

  // Pan to selected vehicle
  useEffect(() => {
    if (!mapRef.current || !selectedVehicle?.latitude || !selectedVehicle?.longitude) return
    // Don't pan to vehicle if a trip route is active — let the route take over
    if (tripPositions && tripPositions.length > 0) return
    mapRef.current.panTo({
      lat: selectedVehicle.latitude,
      lng: selectedVehicle.longitude,
    })
    if (mapRef.current.getZoom()! < 10) {
      mapRef.current.setZoom(12)
    }
  }, [selectedVehicle?.nodeId, selectedVehicle?.latitude, selectedVehicle?.longitude, tripPositions?.length])

  // Fit map to trip route when positions are loaded
  useEffect(() => {
    if (!mapRef.current || !mapLoaded || typeof google === "undefined") return
    if (!tripPositions || tripPositions.length === 0) return

    const bounds = new google.maps.LatLngBounds()
    for (const pos of tripPositions) {
      bounds.extend({ lat: pos.latitude, lng: pos.longitude })
    }
    mapRef.current.fitBounds(bounds, 60)
  }, [tripPositions?.length, mapLoaded])

  function getMarkerIcon(vehicle: TrackedVehicle) {
    if (typeof google === "undefined") return undefined
    const isSelected = selectedVehicle?.nodeId === vehicle.nodeId
    return {
      path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
      scale: isSelected ? 7 : 5,
      fillColor: STATUS_COLORS[vehicle.status] || "#6b7280",
      fillOpacity: 1,
      strokeColor: isSelected ? "#ffffff" : "#000000",
      strokeWeight: isSelected ? 2.5 : 1,
      rotation: vehicle.headingText
        ? headingTextToDegrees(vehicle.headingText)
        : 0,
    }
  }

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER_STYLE}
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      onLoad={onLoad}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
        zoomControl: true,
      }}
    >
      {mapLoaded &&
        vehicles
          .filter((v) => v.latitude !== null && v.longitude !== null)
          .map((vehicle) => (
            <Marker
              key={vehicle.nodeId}
              position={{ lat: vehicle.latitude!, lng: vehicle.longitude! }}
              onClick={() => {
                onVehicleSelect(vehicle)
                setInfoVehicle(vehicle)
              }}
              icon={getMarkerIcon(vehicle)}
              title={`${vehicle.registration} - ${vehicle.status}`}
            />
          ))}

      {infoVehicle && infoVehicle.latitude !== null && infoVehicle.longitude !== null && (
        <InfoWindow
          position={{ lat: infoVehicle.latitude, lng: infoVehicle.longitude }}
          onCloseClick={() => setInfoVehicle(null)}
        >
          <div style={{ minWidth: 160, color: "#000" }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>{infoVehicle.registration}</p>
            <p style={{ fontSize: 12, marginBottom: 2 }}>{infoVehicle.description}</p>
            <p style={{ fontSize: 12, marginBottom: 2 }}>
              Status: {infoVehicle.status} | Speed: {infoVehicle.speed ?? 0} km/h
            </p>
            {infoVehicle.address && (
              <p style={{ fontSize: 11, color: "#666" }}>{infoVehicle.address}</p>
            )}
          </div>
        </InfoWindow>
      )}

      {directions && (
        <DirectionsRenderer
          directions={directions}
          options={{
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: "#2563eb",
              strokeWeight: 4,
              strokeOpacity: 0.8,
            },
          }}
        />
      )}

      {children}
    </GoogleMap>
  )
}

function headingTextToDegrees(heading: string): number {
  const map: Record<string, number> = {
    N: 0,
    NNE: 22.5,
    NE: 45,
    ENE: 67.5,
    E: 90,
    ESE: 112.5,
    SE: 135,
    SSE: 157.5,
    S: 180,
    SSW: 202.5,
    SW: 225,
    WSW: 247.5,
    W: 270,
    WNW: 292.5,
    NW: 315,
    NNW: 337.5,
  }
  return map[heading.toUpperCase()] ?? 0
}
