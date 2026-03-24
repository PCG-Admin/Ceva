// Location Types for Google Maps Integration

export interface LatLng {
  lat: number
  lng: number
}

export interface LocationData {
  address: string
  coordinates: LatLng | null
  placeId?: string
}

export interface ClientAddress {
  label: string
  address: string
}

export interface AddressInputProps {
  id: string
  name: string
  label: string
  value: string
  onChange: (location: LocationData) => void
  placeholder?: string
  required?: boolean
  className?: string
}
