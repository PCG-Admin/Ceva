"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { GoogleMap, Marker } from "@react-google-maps/api"
import { Search, MapPin, Loader2 } from "lucide-react"
import type { LocationData, LatLng } from "@/types/location"
import { useGoogleMapsLoaded } from "./google-maps-provider"

interface PlacePrediction {
  placeId: string
  text: {
    text: string
  }
}

interface MapPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialAddress?: string
  onSelect: (location: LocationData) => void
}

const mapContainerStyle = {
  width: "100%",
  height: "400px",
}

// Default center: Johannesburg, South Africa
const defaultCenter: LatLng = {
  lat: -26.2041,
  lng: 28.0473,
}

export function MapPickerDialog({
  open,
  onOpenChange,
  initialAddress,
  onSelect,
}: MapPickerDialogProps) {
  const isGoogleMapsLoaded = useGoogleMapsLoaded()
  const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null)
  const [selectedAddress, setSelectedAddress] = useState(initialAddress || "")
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchContainerRef = useRef<HTMLDivElement>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Fetch suggestions from Places API (New)
  const fetchSuggestions = async (input: string) => {
    if (!input || input.length < 3) {
      setSuggestions([])
      return
    }

    if (!apiKey) {
      console.warn("Google Maps API key not configured")
      setSuggestions([])
      return
    }

    setLoading(true)
    try {
      const response = await fetch(
        "https://places.googleapis.com/v1/places:autocomplete",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
          },
          body: JSON.stringify({
            input: input,
            includedRegionCodes: ["ZA"],
            languageCode: "en",
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions?.map((s: { placePrediction: PlacePrediction }) => s.placePrediction) || [])
      } else {
        console.error("Places API error:", response.status, response.statusText)
        setSuggestions([])
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  // Get place details to get coordinates
  const getPlaceDetails = async (placeId: string) => {
    if (!apiKey) {
      console.warn("Google Maps API key not configured")
      return null
    }

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=formattedAddress,location`,
        {
          headers: {
            "X-Goog-Api-Key": apiKey,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        return {
          address: data.formattedAddress || "",
          coordinates: data.location
            ? { lat: data.location.latitude, lng: data.location.longitude }
            : null,
        }
      } else {
        console.error("Places details API error:", response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching place details:", error)
    }
    return null
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const value = e.target.value
      setSearchQuery(value)
      // Also update selected address so user can type manually
      setSelectedAddress(value)

      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value)
      }, 300)

      setShowSuggestions(true)
    } catch (error) {
      console.error("Error handling search change:", error)
    }
  }

  const handleSuggestionClick = async (suggestion: PlacePrediction) => {
    try {
      const details = await getPlaceDetails(suggestion.placeId)
      if (details) {
        setSelectedAddress(details.address)
        if (details.coordinates) {
          setSelectedLocation(details.coordinates)
          mapRef.current?.panTo(details.coordinates)
          mapRef.current?.setZoom(15)
        }
      } else {
        setSelectedAddress(suggestion.text.text)
      }
      setSearchQuery(suggestion.text.text)
      setShowSuggestions(false)
      setSuggestions([])
    } catch (error) {
      console.error("Error handling suggestion click:", error)
      setSelectedAddress(suggestion.text.text)
      setSearchQuery(suggestion.text.text)
      setShowSuggestions(false)
      setSuggestions([])
    }
  }

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    if (isGoogleMapsLoaded && typeof google !== 'undefined') {
      geocoderRef.current = new google.maps.Geocoder()
    }
  }, [isGoogleMapsLoaded])

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && geocoderRef.current) {
      const lat = e.latLng.lat()
      const lng = e.latLng.lng()
      setSelectedLocation({ lat, lng })

      // Reverse geocode to get address
      geocoderRef.current.geocode(
        { location: { lat, lng } },
        (results, status) => {
          if (status === "OK" && results?.[0]) {
            setSelectedAddress(results[0].formatted_address)
          }
        }
      )
    }
  }, [])

  const handleConfirm = () => {
    onSelect({
      address: selectedAddress,
      coordinates: selectedLocation,
    })
  }

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setSelectedAddress(initialAddress || "")
      setSelectedLocation(null)
      setSearchQuery("")
      setSuggestions([])
      setShowSuggestions(false)
    }
    onOpenChange(newOpen)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
          <DialogDescription>
            Search for an address or click on the map to select a location
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative" ref={searchContainerRef}>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              placeholder="Search for an address..."
              className="pl-9 pr-9"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.placeId}
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    {suggestion.text.text}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Map */}
          <div className="rounded-lg border overflow-hidden">
            {isGoogleMapsLoaded ? (
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                center={selectedLocation || defaultCenter}
                zoom={selectedLocation ? 15 : 6}
                onClick={onMapClick}
                onLoad={onMapLoad}
                options={{
                  streetViewControl: false,
                  mapTypeControl: false,
                }}
              >
                {selectedLocation && <Marker position={selectedLocation} />}
              </GoogleMap>
            ) : (
              <div className="w-full h-[400px] flex items-center justify-center bg-muted">
                <div className="text-center space-y-2">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Loading map...</p>
                </div>
              </div>
            )}
          </div>

          {/* Selected Address Display */}
          {selectedAddress && (
            <div className="flex items-start gap-2 rounded-md bg-accent/10 p-3">
              <MapPin className="h-4 w-4 text-accent mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Selected Location</p>
                <p className="text-sm text-muted-foreground">{selectedAddress}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedAddress}>
            Confirm Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
