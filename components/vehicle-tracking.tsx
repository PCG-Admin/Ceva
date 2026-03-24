"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MapPin,
  Truck,
  AlertCircle,
  Navigation,
  Clock,
  Activity,
  Search,
  RefreshCw,
  Loader2,
  Package,
  Route,
  X,
} from "lucide-react"
import { useCtrackVehicles, useCtrackTrips } from "@/hooks/use-ctrack-vehicles"
import { useTrackingHistory, useTripPositions } from "@/hooks/use-tracking-history"
import { VehicleMap } from "@/components/vehicle-map"
import { TripRoutePolyline } from "@/components/trip-route-polyline"
import { createClient } from "@/lib/supabase/client"
import type { TrackedVehicle, TrackedVehicleStatus } from "@/types/ctrack"

interface VehicleLoad {
  id: string
  order_number: string
  client: string
  origin: string
  destination: string
  pickup_date: string
  delivery_date: string
  weight: number | null
  material: string
  rate: number
  status: string
}

interface GeofenceEvent {
  event_type: "arrived_pickup" | "left_pickup" | "arrived_destination" | "left_destination"
  occurred_at: string
}

export function VehicleTracking() {
  const { vehicles, isLoading, isRefreshing, error, lastFetched, refresh } = useCtrackVehicles()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedVehicle, setSelectedVehicle] = useState<TrackedVehicle | null>(null)

  const { trips, isLoading: tripsLoading, error: tripsError } = useCtrackTrips(
    selectedVehicle?.nodeId ?? null
  )

  // Load state
  const [vehicleLoads, setVehicleLoads] = useState<VehicleLoad[]>([])
  const [loadsLoading, setLoadsLoading] = useState(false)
  const [selectedLoad, setSelectedLoad] = useState<VehicleLoad | null>(null)
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null)
  const [directionsLoading, setDirectionsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("map")
  const [loadGeofenceEvents, setLoadGeofenceEvents] = useState<Map<string, GeofenceEvent[]>>(new Map())

  const [selectedHorseId, setSelectedHorseId] = useState<string | null>(null)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [ctrackPage, setCtrackPage] = useState(0)
  const CTRACK_PAGE_SIZE = 5

  const { trips: dbTrips, isLoading: dbTripsLoading, error: dbTripsError } = useTrackingHistory(selectedHorseId)
  const { positions: tripPositions } = useTripPositions(selectedTripId)

  const supabase = createClient()

  // Fetch loads for selected vehicle
  const fetchVehicleLoads = useCallback(async (vehicle: TrackedVehicle) => {
    setLoadsLoading(true)
    setVehicleLoads([])

    // Try matching by tracking_unit_id (Ctrack nodeId) first, then by registration prefix
    let horse: { id: string } | null = null

    const { data: byNodeId } = await supabase
      .from("ceva_horses")
      .select("id")
      .eq("tracking_unit_id", String(vehicle.nodeId))
      .single()

    horse = byNodeId

    if (!horse) {
      // Ctrack registration may include a name suffix (e.g. "KFL487NW TATENDA"),
      // so extract just the plate number (first segment) for matching
      const plate = vehicle.registration.split(" ")[0]
      const { data: byReg } = await supabase
        .from("ceva_horses")
        .select("id")
        .eq("registration_number", plate)
        .single()
      horse = byReg
    }

    if (!horse) {
      setLoadsLoading(false)
      setSelectedHorseId(null)
      return
    }

    setSelectedHorseId(horse.id)

    const { data: loads } = await supabase
      .from("ceva_loads")
      .select("id, order_number, client, origin, destination, pickup_date, delivery_date, weight, material, rate, status")
      .eq("horse_id", horse.id)
      .in("status", ["assigned", "in-transit", "pending"])
      .order("pickup_date", { ascending: true })

    const loadList = loads ?? []
    setVehicleLoads(loadList)

    // Fetch geofence events for all loads upfront
    if (loadList.length > 0) {
      const { data: events } = await supabase
        .from("ceva_load_geofence_events")
        .select("load_id, event_type, occurred_at")
        .in("load_id", loadList.map((l) => l.id))
        .order("occurred_at", { ascending: true })

      const eventsMap = new Map<string, GeofenceEvent[]>()
      for (const e of events ?? []) {
        const arr = eventsMap.get(e.load_id) ?? []
        arr.push({ event_type: e.event_type, occurred_at: e.occurred_at })
        eventsMap.set(e.load_id, arr)
      }
      setLoadGeofenceEvents(eventsMap)
    }

    setLoadsLoading(false)
  }, [supabase])

  // Fetch loads when vehicle changes
  useEffect(() => {
    if (selectedVehicle) {
      fetchVehicleLoads(selectedVehicle)
      setSelectedLoad(null)
      setDirections(null)
    } else {
      setVehicleLoads([])
      setSelectedLoad(null)
      setDirections(null)
      setSelectedHorseId(null)
      setSelectedTripId(null)
      setCtrackPage(0)
      setLoadGeofenceEvents(new Map())
    }
  }, [selectedVehicle?.nodeId])

  // Calculate route when a load is selected
  useEffect(() => {
    if (!selectedLoad) {
      setDirections(null)
      return
    }
    setDirectionsLoading(true)
    const service = new google.maps.DirectionsService()
    service.route(
      {
        origin: selectedLoad.origin,
        destination: selectedLoad.destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        setDirectionsLoading(false)
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result)
        } else {
          setDirections(null)
        }
      }
    )
  }, [selectedLoad?.id])

  function handleSelectLoad(load: VehicleLoad) {
    if (selectedLoad?.id === load.id) {
      setSelectedLoad(null)
    } else {
      setSelectedLoad(load)
      setActiveTab("map")
    }
  }

  // Auto-select first vehicle when vehicles load
  useEffect(() => {
    if (vehicles.length > 0 && !selectedVehicle) {
      setSelectedVehicle(vehicles[0])
    }
  }, [vehicles, selectedVehicle])

  // Update selected vehicle data when vehicles refresh
  useEffect(() => {
    if (selectedVehicle && vehicles.length > 0) {
      const updated = vehicles.find((v) => v.nodeId === selectedVehicle.nodeId)
      if (updated) {
        setSelectedVehicle(updated)
      }
    }
  }, [vehicles, selectedVehicle])

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.registration.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.fleetNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || vehicle.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: vehicles.length,
    moving: vehicles.filter((v) => v.status === "moving").length,
    idle: vehicles.filter((v) => v.status === "idle").length,
    stopped: vehicles.filter((v) => v.status === "stopped").length,
  }

  if (isLoading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading vehicle data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Moving</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.moving}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Idle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.idle}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stopped</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.stopped}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Vehicle List */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-foreground">Vehicle Fleet</CardTitle>
            <CardDescription>
              Real-time tracking of all vehicles
              {lastFetched && (
                <span className="block text-xs mt-1">
                  Updated: {new Date(lastFetched).toLocaleTimeString()} (auto-refreshes every 30s)
                </span>
              )}
            </CardDescription>
            <div className="flex gap-2 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="moving">Moving</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                  <SelectItem value="no-data">No Data</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {filteredVehicles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {vehicles.length === 0 ? "No vehicles found" : "No vehicles match your filters"}
              </p>
            ) : (
              filteredVehicles.map((vehicle) => (
                <button
                  key={vehicle.nodeId}
                  onClick={() => setSelectedVehicle(vehicle)}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selectedVehicle?.nodeId === vehicle.nodeId
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold text-foreground">{vehicle.registration}</p>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{vehicle.description}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        <MapPin className="inline h-3 w-3 mr-1" />
                        {vehicle.address ?? "Position data unavailable"}
                      </p>
                    </div>
                    <VehicleStatusBadge status={vehicle.status} />
                  </div>
                  {vehicle.speed !== null && vehicle.speed > 0 && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground">
                        Speed: <span className="font-medium text-foreground">{vehicle.speed} km/h</span>
                      </p>
                    </div>
                  )}
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* Vehicle Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground">
                  {selectedVehicle?.registration || "Select a Vehicle"}
                </CardTitle>
                <CardDescription>Live tracking and vehicle details</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={refresh} disabled={isRefreshing}>
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {selectedVehicle ? (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="map">Live Map</TabsTrigger>
                  <TabsTrigger value="loads" className="relative">
                    Loads
                    {vehicleLoads.length > 0 && (
                      <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                        {vehicleLoads.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                <TabsContent value="map" className="space-y-4">
                  {/* Live Google Map */}
                  <div className="relative h-[400px] rounded-lg border border-border overflow-hidden">
                    <VehicleMap
                      vehicles={vehicles}
                      selectedVehicle={selectedVehicle}
                      onVehicleSelect={setSelectedVehicle}
                      directions={directions}
                      tripPositions={tripPositions}
                    >
                      {tripPositions.length > 0 && (
                        <TripRoutePolyline positions={tripPositions} />
                      )}
                    </VehicleMap>
                    <div className="absolute top-4 left-4 bg-card p-3 rounded-lg shadow-lg border border-border">
                      <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${
                          selectedVehicle.status === "moving" ? "bg-accent animate-pulse" : "bg-muted-foreground"
                        }`} />
                        <span className="text-sm font-medium text-foreground">
                          {selectedVehicle.status === "moving" ? "Live Tracking" : "Last Known Position"}
                        </span>
                      </div>
                    </div>
                    {selectedLoad && (
                      <div className="absolute top-4 right-14 bg-card p-3 rounded-lg shadow-lg border border-border max-w-xs">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{selectedLoad.order_number}</p>
                          <button onClick={() => setSelectedLoad(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{selectedLoad.origin}</p>
                        <p className="text-xs text-muted-foreground truncate">→ {selectedLoad.destination}</p>
                        {directions?.routes[0]?.legs[0] && (
                          <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-border">
                            <span className="text-xs font-medium text-foreground flex items-center gap-1">
                              <Navigation className="h-3 w-3" />
                              {directions.routes[0].legs[0].distance?.text}
                            </span>
                            <span className="text-xs font-medium text-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {directions.routes[0].legs[0].duration?.text}
                            </span>
                          </div>
                        )}
                        {directionsLoading && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span className="text-xs text-muted-foreground">Calculating route...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quick Stats */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Navigation className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Speed</p>
                        <p className={`text-lg font-bold ${
                          selectedVehicle.speed !== null && selectedVehicle.streetMaxSpeed !== null && selectedVehicle.streetMaxSpeed > 0 && selectedVehicle.speed > selectedVehicle.streetMaxSpeed
                            ? "text-destructive"
                            : "text-foreground"
                        }`}>
                          {selectedVehicle.speed !== null ? `${selectedVehicle.speed} km/h` : "N/A"}
                        </p>
                        {selectedVehicle.streetMaxSpeed !== null && selectedVehicle.streetMaxSpeed > 0 && (
                          <p className="text-xs text-muted-foreground">Limit: {selectedVehicle.streetMaxSpeed} km/h</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/10">
                        <Navigation className="h-5 w-5 text-secondary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Heading</p>
                        <p className="text-lg font-bold text-foreground">
                          {selectedVehicle.headingText || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Update</p>
                        <p className="text-lg font-bold text-foreground">
                          {selectedVehicle.lastUpdate ? formatTimeAgo(selectedVehicle.lastUpdate) : "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Current Location */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-foreground">Current Location</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {selectedVehicle.address ?? "Address unavailable"}
                          </p>
                          {selectedVehicle.latitude !== null && selectedVehicle.longitude !== null && (
                            <p className="text-xs text-muted-foreground">
                              {selectedVehicle.latitude.toFixed(5)}, {selectedVehicle.longitude.toFixed(5)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Last updated: {selectedVehicle.lastUpdate ? formatTimeAgo(selectedVehicle.lastUpdate) : "N/A"}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="loads" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-foreground">Assigned Loads</CardTitle>
                      <CardDescription>Active loads assigned to this vehicle</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {loadsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : vehicleLoads.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No active loads assigned to this vehicle</p>
                        </div>
                      ) : (
                        vehicleLoads.map((load) => (
                          <button
                            key={load.id}
                            onClick={() => handleSelectLoad(load)}
                            className={`w-full text-left rounded-lg border p-3 transition-colors ${
                              selectedLoad?.id === load.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-accent"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-semibold text-foreground">{load.order_number}</span>
                              </div>
                              <Badge
                                className={
                                  load.status === "in-transit"
                                    ? "bg-accent text-accent-foreground"
                                    : load.status === "assigned"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary text-secondary-foreground"
                                }
                              >
                                {load.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">{load.client}</p>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-accent shrink-0" />
                                <span className="text-xs text-foreground truncate">{load.origin}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 text-destructive shrink-0" />
                                <span className="text-xs text-foreground truncate">{load.destination}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                              <span>{new Date(load.pickup_date).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}</span>
                              <span>{load.material}</span>
                              {load.weight && <span>{load.weight} t</span>}
                            </div>
                            {selectedLoad?.id === load.id && directions?.routes[0]?.legs[0] && (
                              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
                                <span className="text-xs font-medium text-primary flex items-center gap-1">
                                  <Route className="h-3 w-3" />
                                  {directions.routes[0].legs[0].distance?.text}
                                </span>
                                <span className="text-xs font-medium text-primary flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {directions.routes[0].legs[0].duration?.text}
                                </span>
                              </div>
                            )}
                            {selectedLoad?.id === load.id && directionsLoading && (
                              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span className="text-xs text-muted-foreground">Calculating route...</span>
                              </div>
                            )}
                            <GeofenceTimeline events={loadGeofenceEvents.get(load.id) ?? []} loading={false} />
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="details" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-foreground">Vehicle Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DetailRow label="Registration" value={selectedVehicle.registration} />
                      <DetailRow label="Fleet Number" value={selectedVehicle.fleetNumber} />
                      <DetailRow label="Description" value={selectedVehicle.description} />
                      <DetailRow label="Status" value={<VehicleStatusBadge status={selectedVehicle.status} />} />
                      <DetailRow
                        label="Ignition"
                        value={
                          selectedVehicle.ignition !== null
                            ? selectedVehicle.ignition
                              ? "On"
                              : "Off"
                            : "N/A"
                        }
                      />
                      <DetailRow
                        label="Coordinates"
                        value={
                          selectedVehicle.latitude !== null && selectedVehicle.longitude !== null
                            ? `${selectedVehicle.latitude.toFixed(5)}, ${selectedVehicle.longitude.toFixed(5)}`
                            : "N/A"
                        }
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-foreground">Recorded Trip History</CardTitle>
                      <CardDescription>Trips recorded by our tracking system (last 7 days). Click a trip to view its route on the map.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {dbTripsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : dbTripsError ? (
                        <div className="flex items-center gap-2 text-destructive py-4">
                          <AlertCircle className="h-4 w-4" />
                          <p className="text-sm">{dbTripsError}</p>
                        </div>
                      ) : dbTrips.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No recorded trips found. Trips are recorded automatically as vehicles move.</p>
                      ) : (
                        dbTrips.map((trip) => (
                          <button
                            key={trip.id}
                            onClick={() => {
                              const newTripId = selectedTripId === trip.id ? null : trip.id
                              setSelectedTripId(newTripId)
                              if (newTripId) setActiveTab("map")
                            }}
                            className={`w-full text-left rounded-lg border p-3 transition-colors ${
                              selectedTripId === trip.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-accent"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Route className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">
                                  {new Date(trip.start_time).toLocaleString()}
                                </p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  {trip.distance_km != null && (
                                    <span className="text-xs text-muted-foreground">{trip.distance_km} km</span>
                                  )}
                                  {trip.max_speed > 0 && (
                                    <span className="text-xs text-muted-foreground">Max: {trip.max_speed} km/h</span>
                                  )}
                                  {trip.position_count > 0 && (
                                    <span className="text-xs text-muted-foreground">{trip.position_count} points</span>
                                  )}
                                </div>
                                {trip.start_address && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">From: {trip.start_address}</p>
                                )}
                                {trip.end_address && (
                                  <p className="text-xs text-muted-foreground truncate">To: {trip.end_address}</p>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base text-foreground">Ctrack Trip Log</CardTitle>
                      <CardDescription>Trip metadata from Ctrack (last 7 days)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {tripsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : tripsError ? (
                        <div className="flex items-center gap-2 text-destructive py-4">
                          <AlertCircle className="h-4 w-4" />
                          <p className="text-sm">{tripsError}</p>
                        </div>
                      ) : trips.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">No trips found</p>
                      ) : (
                        <>
                          {trips
                            .slice(ctrackPage * CTRACK_PAGE_SIZE, (ctrackPage + 1) * CTRACK_PAGE_SIZE)
                            .map((trip, index) => (
                              <TripHistoryItem
                                key={`${trip.nodeId}-${trip.startTime}-${index}`}
                                startTime={new Date(trip.startTime).toLocaleString()}
                                endTime={new Date(trip.endTime).toLocaleTimeString()}
                                tripOdo={`${(trip.tripOdo / 1000).toFixed(1)} km`}
                                maxSpeed={trip.maxSpeed > 0 ? `${trip.maxSpeed} km/h` : "N/A"}
                              />
                            ))}
                          {trips.length > CTRACK_PAGE_SIZE && (
                            <div className="flex items-center justify-between pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground">
                                {ctrackPage * CTRACK_PAGE_SIZE + 1}–{Math.min((ctrackPage + 1) * CTRACK_PAGE_SIZE, trips.length)} of {trips.length}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCtrackPage((p) => p - 1)}
                                  disabled={ctrackPage === 0}
                                >
                                  Previous
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setCtrackPage((p) => p + 1)}
                                  disabled={(ctrackPage + 1) * CTRACK_PAGE_SIZE >= trips.length}
                                >
                                  Next
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                Select a vehicle to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function VehicleStatusBadge({ status }: { status: TrackedVehicleStatus }) {
  const statusConfig: Record<TrackedVehicleStatus, { label: string; className: string }> = {
    moving: { label: "Moving", className: "bg-accent text-accent-foreground" },
    idle: { label: "Idle", className: "bg-secondary text-secondary-foreground" },
    stopped: { label: "Stopped", className: "bg-primary text-primary-foreground" },
    "no-data": { label: "No Data", className: "bg-destructive text-destructive-foreground" },
  }

  const config = statusConfig[status]
  return <Badge className={config.className}>{config.label}</Badge>
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function TripHistoryItem({
  startTime,
  endTime,
  tripOdo,
  maxSpeed,
}: {
  startTime: string
  endTime: string
  tripOdo: string
  maxSpeed: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Activity className="h-5 w-5 text-accent shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">{startTime}</p>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs text-muted-foreground">End: {endTime}</p>
          <p className="text-xs text-muted-foreground">Distance: {tripOdo}</p>
          <p className="text-xs text-muted-foreground">Max: {maxSpeed}</p>
        </div>
      </div>
    </div>
  )
}

const GEOFENCE_EVENT_LABELS: Record<string, string> = {
  arrived_pickup: "Arrived at Pickup",
  left_pickup: "Left Pickup",
  arrived_destination: "Arrived at Destination",
  left_destination: "Left Destination",
}

function GeofenceTimeline({ events, loading }: { events: GeofenceEvent[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading journey...</span>
      </div>
    )
  }

  if (events.length === 0) return null

  return (
    <div className="mt-2 pt-2 border-t border-border">
      <p className="text-xs font-medium text-muted-foreground mb-2">Journey Timeline</p>
      <div className="space-y-1.5">
        {events.map((event) => (
          <div key={event.event_type} className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
            <span className="text-xs text-foreground">{GEOFENCE_EVENT_LABELS[event.event_type] ?? event.event_type}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(event.occurred_at).toLocaleString("en-ZA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatTimeAgo(isoString: string): string {
  const now = new Date()
  const then = new Date(isoString)
  const diffMs = now.getTime() - then.getTime()
  const diffMin = Math.floor(diffMs / 60000)

  if (diffMin < 1) return "Just now"
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
