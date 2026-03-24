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

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey ?? "",
    libraries,
    preventGoogleFontsLoading: false,
  })

  if (!apiKey) {
    console.warn("Google Maps API key not configured")
    return <>{children}</>
  }

  if (!isLoaded) {
    return null
  }

  return (
    <GoogleMapsContext.Provider value={isLoaded}>
      {children}
    </GoogleMapsContext.Provider>
  )
}
