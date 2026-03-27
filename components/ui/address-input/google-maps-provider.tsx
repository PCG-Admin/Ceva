"use client"

import { useJsApiLoader, Libraries } from "@react-google-maps/api"
import { ReactNode, createContext, useContext } from "react"

const libraries: Libraries = ["places"]

const GoogleMapsContext = createContext(false)

export function useGoogleMapsLoaded() {
  return useContext(GoogleMapsContext)
}

interface GoogleMapsProviderProps {
  children: ReactNode
}

export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? "",
    libraries,
    preventGoogleFontsLoading: false,
  })

  // Log any load errors for debugging
  if (loadError) {
    console.error("Google Maps failed to load:", loadError)
  }

  if (!apiKey) {
    console.warn("Google Maps API key not configured")
    // Still render children but with isLoaded = false
    return (
      <GoogleMapsContext.Provider value={false}>
        {children}
      </GoogleMapsContext.Provider>
    )
  }

  // Always render children, just pass the loading state
  return (
    <GoogleMapsContext.Provider value={isLoaded}>
      {children}
    </GoogleMapsContext.Provider>
  )
}
