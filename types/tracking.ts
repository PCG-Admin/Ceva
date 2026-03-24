export interface VehicleTrackingPosition {
  id: number
  horse_id: string
  ctrack_node_id: number
  trip_id: string | null
  latitude: number
  longitude: number
  speed: number
  heading: string | null
  ignition: boolean
  address: string | null
  recorded_at: string // ISO 8601
}

export interface VehicleTrip {
  id: string
  horse_id: string
  ctrack_node_id: number
  status: "active" | "completed"
  start_time: string
  end_time: string | null
  start_latitude: number | null
  start_longitude: number | null
  start_address: string | null
  end_latitude: number | null
  end_longitude: number | null
  end_address: string | null
  distance_km: number | null
  max_speed: number
  position_count: number
}

export interface TrackingHistoryApiResponse {
  trips: VehicleTrip[]
  error?: string
}

export interface TripPositionsApiResponse {
  positions: VehicleTrackingPosition[]
  error?: string
}
