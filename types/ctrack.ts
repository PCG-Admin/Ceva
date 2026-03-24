// Ctrack Tracking API Types

// =============================================================
// Raw API response types (as returned by the Ctrack API)
// =============================================================

export interface CtrackBaseResponse {
  ErrorCode: number
}

export interface CtrackLoginResponse extends CtrackBaseResponse {
  SessionToken: string
  SessionDurationMinutes: number
}

export interface CtrackVehicleRaw {
  NodeId: number
  NodeTypeId: number
  Type: string
  MobileId: string
  VehicleRegistration: string
  FleetNumber: string
  Description: string
  MIT: string
  SerialNumber: string | null
  UnitIMEI: string | null
  CellphoneNumber: string | null
  VehicleSymbol: number
  CostCentre: number
  ErrorCode: number
  VIN: string | null
  LastTime: string // ISO 8601 UTC
}

export interface CtrackGetVehiclesResponse extends CtrackBaseResponse {
  VehicleList: CtrackVehicleRaw[]
}

export interface CtrackVehiclePositionRaw {
  NodeId: number
  SingleStatus: number
  StatusText: string
  Ignition: boolean
  Latitude: number
  Longitude: number
  Location: string
  RunningOdo: number
  Speed: number
  StreetMaxSpeed: number
  HeadingText: string
  DriverId: string
  ErrorCode: number
  EventTimeUTC: string // ISO 8601 UTC
}

export interface CtrackGetPositionsResponse extends CtrackBaseResponse {
  LastVehiclePositions: CtrackVehiclePositionRaw[]
}

export interface CtrackTripRaw {
  NodeId: number
  TripOdo: number
  MaxSpeed: number
  Tag: string
  DriverName: string
  DriverId: string
  TripStartUTC: string // ISO 8601 UTC
  TripEndUTC: string // ISO 8601 UTC
}

export interface CtrackGetTripsResponse extends CtrackBaseResponse {
  VehicleTrips: CtrackTripRaw[]
}

// =============================================================
// Normalized frontend types
// =============================================================

export type TrackedVehicleStatus = "moving" | "idle" | "stopped" | "no-data"

export interface TrackedVehicle {
  nodeId: number
  registration: string
  fleetNumber: string
  description: string
  status: TrackedVehicleStatus
  latitude: number | null
  longitude: number | null
  speed: number | null
  headingText: string | null
  ignition: boolean | null
  address: string | null
  statusText: string | null
  streetMaxSpeed: number | null
  lastUpdate: string | null
  runningOdo: number | null
}

export interface TrackedVehicleTrip {
  nodeId: number
  startTime: string
  endTime: string
  tripOdo: number
  maxSpeed: number
  driverName: string | null
}

// =============================================================
// API route response shapes
// =============================================================

export interface CtrackVehiclesApiResponse {
  vehicles: TrackedVehicle[]
  lastFetched: string
  error?: string
}

export interface CtrackTripsApiResponse {
  trips: TrackedVehicleTrip[]
  error?: string
}
