"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { GoogleMap, DirectionsRenderer, Marker } from "@react-google-maps/api"
import { Loader2, Navigation, Clock } from "lucide-react"

const MAP_CONTAINER_STYLE = {
  width: "100%",
  height: "300px",
}

const DEFAULT_CENTER = { lat: -26.2041, lng: 28.0473 } // South Africa

interface LoadRouteMapProps {
  origin: string
  destination: string
}

export function LoadRouteMap({ origin, destination }: LoadRouteMapProps) {
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const directionsRequested = useRef(false)

  const fetchDirections = useCallback(() => {
    if (directionsRequested.current) return
    directionsRequested.current = true

    const service = new google.maps.DirectionsService()
    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        setLoading(false)
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result)
        } else {
          setError("Could not calculate route")
        }
      }
    )
  }, [origin, destination])

  useEffect(() => {
    fetchDirections()
  }, [fetchDirections])

  const leg = directions?.routes[0]?.legs[0]

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-md border bg-muted/30" style={{ height: 300 }}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Calculating route...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-md border bg-muted/30 p-4" style={{ height: 300 }}>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={DEFAULT_CENTER}
        zoom={6}
        options={{
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }}
      >
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
      </GoogleMap>

      {leg && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Navigation className="h-3.5 w-3.5" />
            <span>{leg.distance?.text}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{leg.duration?.text}</span>
          </div>
        </div>
      )}
    </div>
  )
}
