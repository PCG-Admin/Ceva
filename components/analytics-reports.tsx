"use client"

import { useState, useEffect } from "react"
import { User } from "lucide-react"

import { createClient } from "@/lib/supabase/client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  TrendingUp,
  TrendingDown,
  Download,
  Truck,
  Package,
  DollarSign,
  Users,
  MapPin,
  Fuel,
  Clock,
} from "lucide-react"

export function AnalyticsReports() {

  const supabase = createClient()

  const [timeRange, setTimeRange] = useState("30days")

  const [loads, setLoads] = useState<any[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)

  const [pendingLoads, setPendingLoads] = useState(0)
  const [assignedLoads, setAssignedLoads] = useState(0)
  const [deliveredLoads, setDeliveredLoads] = useState(0)
  const [cancelledLoads, setCancelledLoads] = useState(0)
  const [activeLoadsCount, setActiveLoadsCount] = useState(0)

  const [clientStats, setClientStats] = useState<any[]>([])
  const [vehicleStats, setVehicleStats] = useState<any[]>([])

  const [loadTrend, setLoadTrend] = useState<{ month: string; loads: number }[]>([])

  const [fleetUtilization, setFleetUtilization] = useState(0)
  const [onTimeDelivery, setOnTimeDelivery] = useState(0)
  const [inTransitLoads, setInTransitLoads] = useState(0)
  const [availableFleetAssets, setAvailableFleetAssets] = useState(0)
  const [maintenanceAssets, setMaintenanceAssets] = useState(0)
  const [averageTripDurationHours, setAverageTripDurationHours] = useState(0)
  const [horseUtilizationRate, setHorseUtilizationRate] = useState(0)
  const [availableTrailers, setAvailableTrailers] = useState(0)
  const [delayedDelivery, setDelayedDelivery] = useState(0)
  const [averageEarlyDeliveryHours, setAverageEarlyDeliveryHours] = useState(0)
  const [averageDelayHours, setAverageDelayHours] = useState(0)
  const [driverStats, setDriverStats] = useState<any[]>([])

  const [totalKmDriven, setTotalKmDriven] = useState(0)
  const [perTruckKm, setPerTruckKm] = useState<{ registration: string; km: number; trips: number; runningOdo: number | null }[]>([])

  const [isLoading, setIsLoading] = useState(false)

  const [loadChange, setLoadChange] = useState(0)
  const [activeLoadChange, setActiveLoadChange] = useState(0)
  const [utilizationChange, setUtilizationChange] = useState(0)
  const [deliveryChange, setDeliveryChange] = useState(0)

  // Feature flags set to false to hide tabs
  const SHOW_FINANCIAL_TAB = false
  const SHOW_ROUTES_TAB = false
  // Feature flag for Fuel Efficiency section
  const SHOW_FUEL_EFFICIENCY = false

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  // Date Range
  function getDateRangeFromTimeRange(range: string): { startDate: Date; endDate: Date } {
    const endDate = new Date() // Current date
    const startDate = new Date()

    switch (range) {
      case "7days":
        startDate.setDate(endDate.getDate() - 7)
        break
      case "30days":
        startDate.setDate(endDate.getDate() - 30)
        break
      case "90days":
        startDate.setDate(endDate.getDate() - 90)
        break
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1)
        break
      default:
        startDate.setDate(endDate.getDate() - 30) // Default to 30 days
    }

    // Set to start of day for startDate
    startDate.setHours(0, 0, 0, 0)
    // Set to end of day for endDate
    endDate.setHours(23, 59, 59, 999)

    return { startDate, endDate }
  }

  // Calculate percentage change between two periods
  function calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 100)
  }

  async function fetchAnalytics() {
    setIsLoading(true)

    try {
      // Get date range based on selected timeRange
      const { startDate, endDate } = getDateRangeFromTimeRange(timeRange)

      // Calculate previous period dates (same duration, ending at startDate)
      const periodLength = endDate.getTime() - startDate.getTime()
      const prevEndDate = new Date(startDate.getTime() - 1) // One millisecond before startDate
      const prevStartDate = new Date(prevEndDate.getTime() - periodLength)

      // Fetch current period data
      const { data, error } = await supabase
        .from("ceva_loads")
        .select(`
          *,
          driver:ceva_drivers!driver_id(first_name, last_name),
          horse:ceva_horses!horse_id(registration_number)
        `)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())

      if (error) {
        console.error(error)
        return
      }

      // Fetch previous period data for comparison
      const { data: prevData, error: prevError } = await supabase
        .from("ceva_loads")
        .select(`
          *,
          driver:ceva_drivers!driver_id(first_name, last_name),
          horse:ceva_horses!horse_id(registration_number)
        `)
        .gte("created_at", prevStartDate.toISOString())
        .lte("created_at", prevEndDate.toISOString())

      if (prevError) {
        console.error(prevError)
      }

      const [{ data: horsesData, error: horsesError }, { data: trailersData, error: trailersError }] = await Promise.all([
        supabase.from("ceva_horses").select("id, status"),
        supabase.from("ceva_trailers").select("id, status"),
      ])

      if (horsesError) {
        console.error(horsesError)
      }

      if (trailersError) {
        console.error(trailersError)
      }

      if (!data) return

      setLoads(data)

      // TOTAL REVENUE (only from loads in selected date range)
      const revenue = data.reduce((sum, load) => {
        return sum + Number(load.rate || 0)
      }, 0)

      setTotalRevenue(revenue)

      // LOAD STATUS COUNTS
      const pending = data.filter(l => l.status === "pending").length
      const assigned = data.filter(l => l.status === "assigned").length
      const delivered = data.filter(l => l.status === "delivered").length
      const inTransit = data.filter(l => l.status === "in-transit").length
      const cancelled = data.filter(l => l.status === "cancelled").length
      const activeLoads = assigned + inTransit

      setPendingLoads(pending)
      setAssignedLoads(assigned)
      setDeliveredLoads(delivered)
      setInTransitLoads(inTransit)
      setCancelledLoads(cancelled)
      setActiveLoadsCount(activeLoads)

      // FLEET UTILIZATION
      const horses = horsesData || []
      const trailers = trailersData || []
      const activeHorseIds = new Set(
        data
          .filter(load => load.horse_id && (load.status === "assigned" || load.status === "in-transit"))
          .map(load => load.horse_id)
      )

      const utilization = horses.length
        ? Math.round((activeHorseIds.size / horses.length) * 100)
        : 0

      setFleetUtilization(utilization)

      // ON TIME DELIVERY (based on delivered loads)
      const deliveredLoadsWithDates = data.filter(
        l => l.status === "delivered" && l.delivery_date && l.updated_at
      )

      const deliveredPerformance = deliveredLoadsWithDates.reduce(
        (acc, load) => {
          const scheduledDelivery = new Date(`${load.delivery_date}T23:59:59`)
          const actualDelivery = new Date(load.updated_at)
          const diffInHours = Math.round((actualDelivery.getTime() - scheduledDelivery.getTime()) / (1000 * 60 * 60))

          if (diffInHours <= 0) {
            acc.onTime += 1
            acc.earlyHours += Math.abs(diffInHours)
            acc.earlyCount += 1
          } else {
            acc.delayed += 1
            acc.delayHours += diffInHours
            acc.delayCount += 1
          }

          return acc
        },
        { onTime: 0, delayed: 0, earlyHours: 0, earlyCount: 0, delayHours: 0, delayCount: 0 }
      )

      const onTimeDeliveryRate = deliveredLoadsWithDates.length
        ? Math.round((deliveredPerformance.onTime / deliveredLoadsWithDates.length) * 100)
        : 0
      const delayedDeliveryRate = deliveredLoadsWithDates.length
        ? Math.round((deliveredPerformance.delayed / deliveredLoadsWithDates.length) * 100)
        : 0

      setOnTimeDelivery(onTimeDeliveryRate)
      setDelayedDelivery(delayedDeliveryRate)
      setAverageEarlyDeliveryHours(
        deliveredPerformance.earlyCount
          ? Number((deliveredPerformance.earlyHours / deliveredPerformance.earlyCount).toFixed(1))
          : 0
      )
      setAverageDelayHours(
        deliveredPerformance.delayCount
          ? Number((deliveredPerformance.delayHours / deliveredPerformance.delayCount).toFixed(1))
          : 0
      )

      const completedLoadsWithDates = data.filter(
        l => l.pickup_date && l.delivery_date
      )

      const totalTripHours = completedLoadsWithDates.reduce((sum, load) => {
        const pickupDate = new Date(load.pickup_date)
        const deliveryDate = new Date(load.delivery_date)
        const diffInHours = (deliveryDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60)

        return diffInHours > 0 ? sum + diffInHours : sum
      }, 0)

      const avgTripHours = completedLoadsWithDates.length
        ? Math.round(totalTripHours / completedLoadsWithDates.length)
        : 0

      setAverageTripDurationHours(avgTripHours)

      const availableHorses = horses.filter(horse => horse.status === "available").length
      const availableTrailerCount = trailers.filter(trailer => trailer.status === "available").length
      const maintenanceHorseCount = horses.filter(horse => horse.status === "maintenance").length
      const maintenanceTrailerCount = trailers.filter(trailer => trailer.status === "maintenance").length
      const currentHorseUtilization = horses.length
        ? Math.round((activeHorseIds.size / horses.length) * 100)
        : 0

      setAvailableFleetAssets(availableHorses + availableTrailerCount)
      setMaintenanceAssets(maintenanceHorseCount + maintenanceTrailerCount)
      setHorseUtilizationRate(currentHorseUtilization)
      setAvailableTrailers(availableTrailerCount)

      // CLIENT PERFORMANCE
      const clientMap: any = {}
      const prevClientMap: any = {}

      data.forEach(load => {
        if (!clientMap[load.client]) {
          clientMap[load.client] = {
            client: load.client,
            revenue: 0,
            loads: 0
          }
        }

        clientMap[load.client].revenue += Number(load.rate || 0)
        clientMap[load.client].loads += 1
      })

      prevData?.forEach(load => {
        if (!prevClientMap[load.client]) {
          prevClientMap[load.client] = {
            revenue: 0,
          }
        }

        prevClientMap[load.client].revenue += Number(load.rate || 0)
      })

      const clients = Object.values(clientMap)
        .map((client: any) => ({
          ...client,
          growth: calculateChange(client.revenue, prevClientMap[client.client]?.revenue || 0),
        }))
        .sort((a: any, b: any) => b.revenue - a.revenue)
        .slice(0, 4)

      setClientStats(clients)

      // VEHICLE PERFORMANCE
      const vehicleMap: any = {}

      data.forEach(load => {
        const vehicle = load.horse?.registration_number || "Unknown"

        if (!vehicleMap[vehicle]) {
          vehicleMap[vehicle] = {
            vehicle,
            trips: 0,
            revenue: 0
          }
        }

        vehicleMap[vehicle].trips += 1
        vehicleMap[vehicle].revenue += Number(load.rate || 0)
      })

      const vehicles = Object.values(vehicleMap)
        .sort((a: any, b: any) => b.trips - a.trips)
        .slice(0, 4)

      setVehicleStats(vehicles)

      const driverMap: Record<string, { driver: string; trips: number; onTimeDeliveries: number; deliveredLoads: number }> = {}

      data.forEach(load => {
        if (!load.driver_id || !load.driver) return

        const driverName = `${load.driver.first_name} ${load.driver.last_name}`.trim()

        if (!driverMap[load.driver_id]) {
          driverMap[load.driver_id] = {
            driver: driverName,
            trips: 0,
            onTimeDeliveries: 0,
            deliveredLoads: 0,
          }
        }

        driverMap[load.driver_id].trips += 1

        if (load.status === "delivered" && load.delivery_date && load.updated_at) {
          const scheduledDelivery = new Date(`${load.delivery_date}T23:59:59`)
          const actualDelivery = new Date(load.updated_at)

          driverMap[load.driver_id].deliveredLoads += 1

          if (actualDelivery.getTime() <= scheduledDelivery.getTime()) {
            driverMap[load.driver_id].onTimeDeliveries += 1
          }
        }
      })

      const topDrivers = Object.values(driverMap)
        .map(driver => ({
          driver: driver.driver,
          trips: driver.trips,
          onTime: driver.deliveredLoads
            ? Math.round((driver.onTimeDeliveries / driver.deliveredLoads) * 100)
            : 0,
        }))
        .sort((a, b) => b.trips - a.trips)
        .slice(0, 4)

      setDriverStats(topDrivers)

      // LOAD CREATION TREND (LAST 6 MONTHS)
      const today = new Date()
      const trendData: { month: string; loads: number; m: number; y: number }[] = []

      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
        trendData.push({
          month: d.toLocaleString("default", { month: "short" }),
          loads: 0,
          m: d.getMonth(),
          y: d.getFullYear(),
        })
      }

      data.forEach(load => {
        if (!load.created_at) return
        const date = new Date(load.created_at)
        const m = date.getMonth()
        const y = date.getFullYear()

        const match = trendData.find(t => t.m === m && t.y === y)
        if (match) match.loads += 1
      })

      setLoadTrend(trendData.map(({ month, loads }) => ({ month, loads })))

      // CALCULATE PERCENTAGE CHANGES FROM PREVIOUS PERIOD
      if (prevData) {
        // Total loads change
        const prevTotalLoads = prevData.length
        setLoadChange(calculateChange(data.length, prevTotalLoads))

        // Active loads change
        const prevActiveLoads = prevData.filter(
          l => l.status === "assigned" || l.status === "in-transit"
        ).length
        setActiveLoadChange(calculateChange(activeLoads, prevActiveLoads))

        // Fleet utilization change
        const prevActiveHorseIds = new Set(
          prevData
            .filter(l => l.horse_id && (l.status === "assigned" || l.status === "in-transit"))
            .map(l => l.horse_id)
        )
        const prevUtilization = horses.length
          ? Math.round((prevActiveHorseIds.size / horses.length) * 100)
          : 0
        setUtilizationChange(calculateChange(utilization, prevUtilization))

        // On-time delivery change
        const prevDeliveredLoadsWithDates = prevData.filter(
          l => l.status === "delivered" && l.delivery_date && l.updated_at
        )
        const prevOnTimeDeliveries = prevDeliveredLoadsWithDates.filter(load => {
          const scheduledDelivery = new Date(`${load.delivery_date}T23:59:59`)
          const actualDelivery = new Date(load.updated_at)

          return actualDelivery.getTime() <= scheduledDelivery.getTime()
        }).length
        const prevOnTimePercent = prevDeliveredLoadsWithDates.length
          ? Math.round((prevOnTimeDeliveries / prevDeliveredLoadsWithDates.length) * 100)
          : 0
        setDeliveryChange(calculateChange(onTimeDeliveryRate, prevOnTimePercent))
      }

      // KM DRIVEN — from completed vehicle_trips in period
      const { data: tripData } = await supabase
        .from("ceva_vehicle_trips")
        .select("distance_km, horse_id, horses!horse_id(registration_number)")
        .eq("status", "completed")
        .gte("end_time", startDate.toISOString())
        .lte("end_time", endDate.toISOString())

      // Live odometer readings from Ctrack
      const odoRes = await fetch("/api/ctrack/vehicles").then(r => r.json()).catch(() => ({ vehicles: [] }))
      const odoMap = new Map<string, number>()
      for (const v of (odoRes.vehicles ?? []) as { registration: string; runningOdo: number | null }[]) {
        if (v.registration && v.runningOdo != null) {
          odoMap.set(v.registration.split(" ")[0].toUpperCase(), v.runningOdo)
        }
      }

      const totalKm = Math.round((tripData ?? []).reduce((sum, t) => sum + (t.distance_km ?? 0), 0))
      setTotalKmDriven(totalKm)

      const truckMap = new Map<string, { registration: string; km: number; trips: number }>()
      for (const trip of tripData ?? []) {
        const reg = (trip.horses as { registration_number: string } | null)?.registration_number ?? "Unknown"
        const existing = truckMap.get(reg) ?? { registration: reg, km: 0, trips: 0 }
        existing.km += trip.distance_km ?? 0
        existing.trips += 1
        truckMap.set(reg, existing)
      }
      const truckList = Array.from(truckMap.values())
        .map(t => ({ ...t, km: Math.round(t.km), runningOdo: odoMap.get(t.registration.toUpperCase()) ?? null }))
        .sort((a, b) => b.km - a.km)
      setPerTruckKm(truckList)

    } catch (error) {
      console.error("Error fetching analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Performance Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            {timeRange === "7days" && "Last 7 days"}
            {timeRange === "30days" && "Last 30 days"}
            {timeRange === "90days" && "Last 90 days"}
            {timeRange === "year" && "This year"}
          </p>
        </div>

        <div className="flex gap-2">

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          {false && (  // This will hide the button
            <Button variant="outline" disabled={isLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}

        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-muted-foreground">Loading analytics...</span>
        </div>
      )}

      {!isLoading && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

            <KPICard
              title="Total Loads"
              value={loads.length.toString()}
              change={loadChange}
              trend={loadChange >= 0 ? "up" : "down"}
              icon={<Package className="h-5 w-5" />}
            />

            <KPICard
              title="Active Loads"
              value={activeLoadsCount.toString()}
              change={activeLoadChange}
              trend={activeLoadChange >= 0 ? "up" : "down"}
              icon={<Package className="h-5 w-5" />}
            />

            <KPICard
              title="Fleet Utilization"
              value={`${fleetUtilization}%`}
              change={utilizationChange}
              trend={utilizationChange >= 0 ? "up" : "down"}
              icon={<Truck className="h-5 w-5" />}
            />

            <KPICard
              title="On-time Delivery"
              value={`${onTimeDelivery}%`}
              change={deliveryChange}
              trend={deliveryChange >= 0 ? "up" : "down"}
              icon={<Clock className="h-5 w-5" />}
            />

          </div>

          <Tabs defaultValue="performance" className="space-y-6">

            <TabsList>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              {SHOW_FINANCIAL_TAB && <TabsTrigger value="financial">Financial</TabsTrigger>}
              {SHOW_ROUTES_TAB && <TabsTrigger value="routes">Routes</TabsTrigger>}
            </TabsList>

            <TabsContent value="performance" className="space-y-6">

              <div className="grid gap-6 lg:grid-cols-2">

                <Card>

                  <CardHeader>
                    <CardTitle>Load Creation Trend</CardTitle>
                    <CardDescription>Monthly load creation activity</CardDescription>
                  </CardHeader>

                  <CardContent>
                    <ChartContainer
                      config={{
                        loads: {
                          label: "Loads",
                          color: "var(--chart-1)",
                        },
                      } satisfies ChartConfig}
                      className="h-[250px] w-full"
                    >
                      <AreaChart data={loadTrend} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="loadsFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-loads)" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="var(--color-loads)" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          dataKey="loads"
                          type="monotone"
                          fill="url(#loadsFill)"
                          stroke="var(--color-loads)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>

                </Card>

                <Card>

                  <CardHeader>
                    <CardTitle>Load Distribution</CardTitle>
                    <CardDescription>By status</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">

                    <ProgressBar
                      label="Pending"
                      value={pendingLoads}
                      total={loads.length}
                      percentage={loads.length ? (pendingLoads / loads.length) * 100 : 0}
                      color="bg-yellow-500"
                    />

                    <ProgressBar
                      label="Assigned"
                      value={assignedLoads}
                      total={loads.length}
                      percentage={loads.length ? (assignedLoads / loads.length) * 100 : 0}
                      color="bg-accent"
                    />

                    <ProgressBar
                      label="In Transit"
                      value={inTransitLoads}
                      total={loads.length}
                      percentage={loads.length ? (inTransitLoads / loads.length) * 100 : 0}
                      color="bg-orange-500"
                    />

                    <ProgressBar
                      label="Delivered"
                      value={deliveredLoads}
                      total={loads.length}
                      percentage={loads.length ? (deliveredLoads / loads.length) * 100 : 0}
                      color="bg-primary"
                    />

                    <ProgressBar
                      label="Cancelled"
                      value={cancelledLoads}
                      total={loads.length}
                      percentage={loads.length ? (cancelledLoads / loads.length) * 100 : 0}
                      color="bg-red-500"
                    />

                  </CardContent>

                </Card>

                <Card>

                  <CardHeader>
                    <CardTitle>Top Performing Vehicles</CardTitle>
                    <CardDescription>Based on total loads assigned</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">

                    {vehicleStats.map((v, i) => (

                      <VehiclePerformanceItem
                        key={i}
                        vehicle={v.vehicle}
                        trips={v.trips}
                      />

                    ))}

                  </CardContent>

                </Card>

                <Card>

                  <CardHeader>
                    <CardTitle>Client Performance</CardTitle>
                    <CardDescription>Top clients by revenue contribution</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">

                    {clientStats.map((c, i) => (

                      <ClientPerformanceItem
                        key={i}
                        client={c.client}
                        revenue={c.revenue}
                        loads={c.loads}
                        growth={c.growth}
                      />

                    ))}

                  </CardContent>

                </Card>

              </div>

            </TabsContent>

            {/* OPERATIONS TAB */}
            <TabsContent value="operations" className="space-y-6">

              {/* Total KM Driven — full-width summary card */}
              <Card>
                <CardContent className="flex items-center gap-6 py-6">
                  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 shrink-0">
                    <Truck className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total KM Driven</p>
                    <p className="text-4xl font-bold text-foreground">
                      {totalKmDriven.toLocaleString()} <span className="text-lg font-normal text-muted-foreground">km</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Across all completed trips in period</p>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">

                <Card>
                  <CardHeader>
                    <CardTitle>Fleet Status Overview</CardTitle>
                    <CardDescription>Real-time vehicle availability</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">

                    <div className="grid grid-cols-3 gap-4">

                      <div className="text-center p-4 rounded-lg border">
                        <p className="text-2xl font-bold text-accent">{inTransitLoads}</p>
                        <p className="text-xs text-muted-foreground mt-1">In Transit</p>
                      </div>

                      <div className="text-center p-4 rounded-lg border">
                        <p className="text-2xl font-bold text-primary">{availableFleetAssets}</p>
                        <p className="text-xs text-muted-foreground mt-1">Available</p>
                      </div>

                      <div className="text-center p-4 rounded-lg border">
                        <p className="text-2xl font-bold text-destructive">{maintenanceAssets}</p>
                        <p className="text-xs text-muted-foreground mt-1">Maintenance</p>
                      </div>

                    </div>

                    <div className="pt-4 space-y-3">
                      <MetricRow label="Average Trip Duration" value={`${averageTripDurationHours} hours`} />
                      <MetricRow label="Available Horses + Trailers" value={availableFleetAssets.toString()} />
                      <MetricRow label="Horse Utilization Rate" value={`${horseUtilizationRate}%`} />
                      <MetricRow label="Available Trailers" value={availableTrailers.toString()} />
                    </div>

                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Delivery Performance</CardTitle>
                    <CardDescription>On-time delivery metrics</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">

                    <div className="grid grid-cols-2 gap-4">

                      <div className="p-4 rounded-lg bg-accent/10">
                        <p className="text-xs text-muted-foreground mb-1">On-Time</p>
                        <p className="text-2xl font-bold text-accent">{onTimeDelivery}%</p>
                      </div>

                      <div className="p-4 rounded-lg bg-destructive/10">
                        <p className="text-xs text-muted-foreground mb-1">Delayed</p>
                        <p className="text-2xl font-bold text-destructive">{delayedDelivery}%</p>
                      </div>

                    </div>

                    <div className="pt-4 space-y-3">
                      <MetricRow label="Avg Early Delivery" value={`${averageEarlyDeliveryHours} hours`} />
                      <MetricRow label="Avg Delay Time" value={`${averageDelayHours} hours`} />
                    </div>

                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Driver Performance</CardTitle>
                    <CardDescription>Top drivers by metrics</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">

                    {driverStats.map((driver, i) => (
                      <DriverPerformanceItem
                        key={i}
                        driver={driver.driver}
                        trips={driver.trips}
                        onTime={driver.onTime}
                      />
                    ))}

                  </CardContent>
                </Card>

                {/* Fleet Mileage — per-truck KM breakdown + odometer */}
                <Card>
                  <CardHeader>
                    <CardTitle>Fleet Mileage</CardTitle>
                    <CardDescription>KM driven per truck this period + current odometer</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    {perTruckKm.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No trip data for this period</p>
                    ) : (
                      perTruckKm.map((truck) => (
                        <div key={truck.registration} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div>
                            <p className="text-sm font-medium text-foreground">{truck.registration}</p>
                            <p className="text-xs text-muted-foreground">{truck.trips} trip{truck.trips !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">{truck.km.toLocaleString()} km</p>
                            {truck.runningOdo != null && (
                              <p className="text-xs text-muted-foreground">Odo: {truck.runningOdo.toLocaleString()} km</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* Fuel Efficiency Section - Hidden for future use */}
                {SHOW_FUEL_EFFICIENCY && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Fuel Efficiency</CardTitle>
                      <CardDescription>Fleet-wide fuel consumption</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">

                      <div className="grid grid-cols-2 gap-4">

                        <div className="p-4 rounded-lg border">
                          <Fuel className="h-5 w-5 text-primary mb-2" />
                          <p className="text-xs text-muted-foreground">Avg Mileage</p>
                          <p className="text-xl font-bold">6.2 km/L</p>
                        </div>

                        <div className="p-4 rounded-lg border">
                          <DollarSign className="h-5 w-5 text-secondary mb-2" />
                          <p className="text-xs text-muted-foreground">Fuel Cost</p>
                          <p className="text-xl font-bold">R84K</p>
                        </div>

                      </div>

                      <div className="pt-4 space-y-3">
                        <MetricRow label="Best Mileage Vehicle" value="GP-01-AB-1234 (7.2 km/L)" />
                        <MetricRow label="Total Fuel Consumed" value="14,285 liters" />
                        <MetricRow label="Cost per KM" value="R0.94" />
                      </div>

                    </CardContent>
                  </Card>
                )}

              </div>

            </TabsContent>

            {/* FINANCIAL TAB */}
            {SHOW_FINANCIAL_TAB && (
              <TabsContent value="financial" className="space-y-6">

                <div className="grid gap-6 lg:grid-cols-2">

                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Breakdown</CardTitle>
                      <CardDescription>By service type</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <RevenueBreakdownItem category="Full Truck Load (FTL)" amount={1850000} percentage={58} />
                      <RevenueBreakdownItem category="Part Truck Load (PTL)" amount={920000} percentage={29} />
                      <RevenueBreakdownItem category="Express Delivery" amount={415000} percentage={13} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Expense Analysis</CardTitle>
                      <CardDescription>Operating costs breakdown</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <ExpenseItem category="Fuel" amount={840000} percentage={42} />
                      <ExpenseItem category="Maintenance" amount={380000} percentage={19} />
                      <ExpenseItem category="Driver Salaries" amount={560000} percentage={28} />
                      <ExpenseItem category="Insurance & Permits" amount={220000} percentage={11} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Profit Margin Analysis</CardTitle>
                      <CardDescription>Monthly profitability trends</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">

                      <div className="grid grid-cols-3 gap-4">

                        <div className="text-center p-4 rounded-lg bg-primary/10">
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-xl font-bold">R3.2M</p>
                        </div>

                        <div className="text-center p-4 rounded-lg bg-destructive/10">
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className="text-xl font-bold">R2.0M</p>
                        </div>

                        <div className="text-center p-4 rounded-lg bg-accent/10">
                          <p className="text-xs text-muted-foreground">Net Profit</p>
                          <p className="text-xl font-bold">R1.2M</p>
                        </div>

                      </div>

                      <div className="pt-4 space-y-3">
                        <MetricRow label="Profit Margin" value="37.5%" />
                        <MetricRow label="Operating Ratio" value="62.5%" />
                        <MetricRow label="Return on Assets" value="18.3%" />
                      </div>

                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Analytics</CardTitle>
                      <CardDescription>Collection and receivables</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">

                      <div className="space-y-3">

                        <div className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="text-sm font-medium">Outstanding Receivables</p>
                            <p className="text-xs text-muted-foreground">45 invoices pending</p>
                          </div>
                          <p className="text-lg font-bold text-destructive">R245K</p>
                        </div>

                        <div className="flex items-center justify-between p-3 rounded-lg border">
                          <div>
                            <p className="text-sm font-medium">Collected This Month</p>
                            <p className="text-xs text-muted-foreground">142 invoices paid</p>
                          </div>
                          <p className="text-lg font-bold text-accent">R2.8M</p>
                        </div>

                      </div>

                      <div className="pt-4 space-y-3">
                        <MetricRow label="Avg Collection Time" value="12 days" />
                        <MetricRow label="Bad Debt Ratio" value="1.2%" />
                        <MetricRow label="Early Payment Discount" value="R4.5K saved" />
                      </div>

                    </CardContent>
                  </Card>

                </div>

              </TabsContent>
            )}

            {/* ROUTES TAB */}
            {SHOW_ROUTES_TAB && (
              <TabsContent value="routes" className="space-y-6">

                <div className="grid gap-6 lg:grid-cols-2">

                  {/* Popular Routes */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Routes</CardTitle>
                      <CardDescription>Most frequently used corridors</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">

                      <RouteItem route="Johannesburg → Cape Town" trips={48} revenue={4080000} />
                      <RouteItem route="Cape Town → Durban" trips={42} revenue={3780000} />
                      <RouteItem route="Durban → Pretoria" trips={38} revenue={2850000} />
                      <RouteItem route="Port Elizabeth → Johannesburg" trips={35} revenue={3325000} />
                      <RouteItem route="Pretoria → Bloemfontein" trips={31} revenue={2480000} />

                    </CardContent>
                  </Card>

                  {/* Route Efficiency */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Route Efficiency</CardTitle>
                      <CardDescription>Performance by corridor</CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">

                      <RouteEfficiencyItem route="Johannesburg → Cape Town" onTime={96} avgTime="15h" />
                      <RouteEfficiencyItem route="Cape Town → Durban" onTime={94} avgTime="18h" />
                      <RouteEfficiencyItem route="Durban → Pretoria" onTime={92} avgTime="6h" />
                      <RouteEfficiencyItem route="Port Elizabeth → Johannesburg" onTime={90} avgTime="12h" />

                    </CardContent>
                  </Card>

                  {/* Geographic Distribution */}
                  <Card className="lg:col-span-2">

                    <CardHeader>
                      <CardTitle>Geographic Distribution</CardTitle>
                      <CardDescription>Deliveries by province</CardDescription>
                    </CardHeader>

                    <CardContent>

                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">

                        <StateMetric state="Gauteng" loads={89} percentage={23} />
                        <StateMetric state="Western Cape" loads={76} percentage={20} />
                        <StateMetric state="KwaZulu-Natal" loads={68} percentage={18} />
                        <StateMetric state="Eastern Cape" loads={54} percentage={14} />
                        <StateMetric state="Mpumalanga" loads={47} percentage={12} />
                        <StateMetric state="Free State" loads={35} percentage={9} />
                        <StateMetric state="Others" loads={15} percentage={4} />

                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </>
      )}

    </div>
  )
}

function RouteEfficiencyItem({ route, onTime, avgTime }: any) {

  return (

    <div className="p-3 rounded-lg border">

      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{route}</p>
        <span className="text-xs font-semibold text-accent">{onTime}%</span>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Avg: {avgTime}</span>
      </div>

    </div>

  )

}

function StateMetric({ state, loads, percentage }: any) {

  return (

    <div className="p-3 rounded-lg border">

      <p className="text-sm font-medium mb-1">{state}</p>

      <p className="text-2xl font-bold">{loads}</p>

      <p className="text-xs text-muted-foreground mt-1">
        {percentage}% of total
      </p>

    </div>

  )

}

function ExpenseItem({ category, amount, percentage }: any) {

  return (

    <div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{category}</span>
        <span className="text-sm font-medium">R{(amount / 1000).toFixed(0)}K</span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-destructive/70" style={{ width: `${percentage}%` }} />
      </div>

    </div>

  )
}

function RouteItem({ route, trips, revenue }: any) {

  return (

    <div className="flex items-center justify-between p-3 rounded-lg border">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <MapPin className="h-5 w-5 text-accent" />
        </div>

        <div>
          <p className="text-sm font-medium">{route}</p>
          <p className="text-xs text-muted-foreground">{trips} trips</p>
        </div>

      </div>

      <p className="text-sm font-semibold">
        R{(revenue / 1000).toFixed(0)}K
      </p>

    </div>

  )
}

function DriverPerformanceItem({ driver, trips, onTime }: any) {

  return (

    <div className="flex items-center justify-between p-3 rounded-lg border">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <User className="h-5 w-5 text-accent" />
        </div>

        <div>
          <p className="text-sm font-medium">{driver}</p>
          <p className="text-xs text-muted-foreground">{trips} trips | {onTime}% on-time</p>
        </div>

      </div>

      <div className="text-sm font-medium text-muted-foreground">{onTime}% on-time</div>

    </div>

  )
}

function RevenueBreakdownItem({ category, amount, percentage }: any) {

  return (

    <div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{category}</span>
        <span className="text-sm font-medium">R{(amount / 1000).toFixed(0)}K</span>
      </div>

      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${percentage}%` }} />
      </div>

    </div>

  )
}

function MetricRow({ label, value }: any) {

  return (

    <div className="flex items-center justify-between py-2 border-b last:border-0">

      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="text-sm font-medium">
        {value}
      </span>

    </div>

  )

}

function KPICard({ title, value, change, trend, icon }: any) {

  return (
    <Card>

      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>

      <CardContent>

        <div className="text-2xl font-bold">
          {value}
        </div>

        <div className={`flex items-center gap-1 text-xs mt-1 ${trend === "up" ? "text-accent" : "text-destructive"}`}>
          {change !== 0 ? (
            <>
              {trend === "up" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{Math.abs(change)}% from last period</span>
            </>
          ) : (
            <span className="text-muted-foreground">No previous data</span>
          )}
        </div>

      </CardContent>

    </Card>
  )
}

function ProgressBar({ label, value, total, percentage, color }: any) {

  return (
    <div>

      <div className="flex items-center justify-between mb-2">
        <span className="text-sm">{label}</span>
        <span className="text-sm">{value}/{total}</span>
      </div>

      <div className="h-2 rounded-full bg-muted overflow-hidden">

        <div
          className={`h-full ${color}`}
          style={{ width: `${percentage}%` }}
        />

      </div>

    </div>
  )
}

function VehiclePerformanceItem({ vehicle, trips }: any) {

  return (
    <div className="flex items-center p-3 rounded-lg border">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Truck className="h-5 w-5 text-primary" />
        </div>

        <div>
          <p className="text-sm font-medium">{vehicle}</p>
          <p className="text-xs text-muted-foreground">{trips} total loads</p>
        </div>

      </div>

    </div>
  )
}

function ClientPerformanceItem({ client, revenue, loads, growth }: any) {

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border">

      <div className="flex items-center gap-3">

        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
          <Users className="h-5 w-5 text-secondary" />
        </div>

        <div>
          <p className="text-sm font-medium">{client}</p>
          <p className="text-xs text-muted-foreground">{loads} loads</p>
        </div>

      </div>

      <div className="text-right">

        <p className="text-sm font-semibold">
          R{revenue.toLocaleString()}
        </p>

        <p className={`text-xs ${growth >= 0 ? "text-accent" : "text-destructive"}`}>
          {growth >= 0 ? "+" : ""}
          {growth}%
        </p>

      </div>

    </div>
  )
}
