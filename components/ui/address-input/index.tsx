"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { MapPin, Loader2, Link } from "lucide-react"
import { MapPickerDialog } from "./map-picker-dialog"
import type { LocationData, AddressInputProps } from "@/types/location"

// Parse Google Maps URL to extract coordinates
function parseGoogleMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    // Priority 1: !3d and !4d in data parameter - this is the actual pin location
    const dataPattern = /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/
    const dataMatch = url.match(dataPattern)
    if (dataMatch) {
      return { lat: parseFloat(dataMatch[1]), lng: parseFloat(dataMatch[2]) }
    }

    // Priority 2: ?q=lat,lng or ?ll=lat,lng - direct coordinate queries
    const queryPattern = /[?&](q|ll|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const queryMatch = url.match(queryPattern)
    if (queryMatch) {
      return { lat: parseFloat(queryMatch[2]), lng: parseFloat(queryMatch[3]) }
    }

    // Priority 3: /place/lat,lng - place coordinates
    const placePattern = /\/place\/(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const placeMatch = url.match(placePattern)
    if (placeMatch) {
      return { lat: parseFloat(placeMatch[1]), lng: parseFloat(placeMatch[2]) }
    }

    // Priority 4: @lat,lng in URL path - map center (least precise, fallback only)
    const atPattern = /@(-?\d+\.?\d*),(-?\d+\.?\d*)/
    const atMatch = url.match(atPattern)
    if (atMatch) {
      return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) }
    }

    return null
  } catch {
    return null
  }
}

// Check if string is a Google Maps URL
function isGoogleMapsUrl(text: string): boolean {
  return /^https?:\/\/(www\.)?(google\.(com|co\.[a-z]{2})\/maps|maps\.google\.(com|co\.[a-z]{2})|goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(text.trim())
}

// Check if it's a short URL that needs resolving
function isShortMapsUrl(text: string): boolean {
  return /^https?:\/\/(goo\.gl\/maps|maps\.app\.goo\.gl)/i.test(text.trim())
}

export { GoogleMapsProvider } from "./google-maps-provider"
export { MapPickerDialog } from "./map-picker-dialog"

interface PlacePrediction {
  placeId: string
  text: {
    text: string
  }
}

export function AddressInput({
  id,
  name,
  label,
  value,
  onChange,
  placeholder = "Enter address or paste Google Maps link",
  required = false,
  className,
}: AddressInputProps) {
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState("")
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  // Fetch suggestions from Places API (New)
  const fetchSuggestions = async (input: string) => {
    if (!input || input.length < 3 || !apiKey) {
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
            includedRegionCodes: ["ZA"], // South Africa
            languageCode: "en",
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions?.map((s: { placePrediction: PlacePrediction }) => s.placePrediction) || [])
      } else {
        setSuggestions([])
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error)
      setSuggestions([])
    }
    setLoading(false)
  }

  // Get place details to get coordinates
  const getPlaceDetails = async (placeId: string) => {
    if (!apiKey) return null

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
          placeId: placeId,
        }
      }
    } catch (error) {
      console.error("Error fetching place details:", error)
    }
    return null
  }

  // Reverse geocode coordinates to get address
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    if (!apiKey) return null

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      )

      if (response.ok) {
        const data = await response.json()
        if (data.results && data.results.length > 0) {
          return data.results[0].formatted_address
        }
      }
    } catch (error) {
      console.error("Error reverse geocoding:", error)
    }
    return null
  }

  // Handle paste event to detect Google Maps URLs
  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData("text").trim()

    if (isGoogleMapsUrl(pastedText)) {
      e.preventDefault()
      setLoading(true)
      setLoadingMessage("Resolving link...")

      let coords: { lat: number; lng: number } | null = null

      // Check if it's a short URL that needs resolving
      if (isShortMapsUrl(pastedText)) {
        try {
          const response = await fetch("/api/resolve-maps-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: pastedText }),
          })
          if (response.ok) {
            const data = await response.json()
            coords = data.coordinates
          }
        } catch (error) {
          console.error("Error resolving short URL:", error)
        }
      } else {
        // Try to parse coordinates directly from the URL
        coords = parseGoogleMapsUrl(pastedText)
      }

      if (coords) {
        setLoadingMessage("Getting address...")
        // Try to get address from coordinates
        const address = await reverseGeocode(coords.lat, coords.lng)
        onChange({
          address: address || `${coords.lat}, ${coords.lng}`,
          coordinates: coords,
        })
        setShowSuggestions(false)
        setSuggestions([])
      } else {
        // If we couldn't parse coords, just paste the URL
        onChange({ address: pastedText, coordinates: null })
      }

      setLoading(false)
      setLoadingMessage("")
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    onChange({ address: newValue, coordinates: null })

    // Debounce the API call
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue)
    }, 300)

    setShowSuggestions(true)
  }

  const handleSuggestionClick = async (suggestion: PlacePrediction) => {
    const details = await getPlaceDetails(suggestion.placeId)
    if (details) {
      onChange(details)
    } else {
      onChange({ address: suggestion.text.text, coordinates: null })
    }
    setShowSuggestions(false)
    setSuggestions([])
  }

  const handleMapSelect = (location: LocationData) => {
    onChange(location)
    setIsMapOpen(false)
  }

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  return (
    <div className={className} ref={containerRef}>
      <div className="space-y-2">
        <Label htmlFor={id}>
          {label}
          {required && " *"}
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id={id}
              name={name}
              value={value}
              onChange={handleInputChange}
              onPaste={handlePaste}
              onFocus={() => value.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={placeholder}
              required={required}
              autoComplete="off"
            />
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingMessage && <span className="text-xs">{loadingMessage}</span>}
              </div>
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
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsMapOpen(true)}
            title="Pick location on map"
          >
            <MapPin className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <MapPickerDialog
        open={isMapOpen}
        onOpenChange={setIsMapOpen}
        initialAddress={value}
        onSelect={handleMapSelect}
      />
    </div>
  )
}
