"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import { startOfWeek, addDays, format } from "date-fns"
import { toast } from "sonner"
import { Loader2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { WeekSelector } from "./dispatch-planning/week-selector"
import { PlanningFilters } from "./dispatch-planning/planning-filters"
import { UnassignedLoadsPanel } from "./dispatch-planning/unassigned-loads-panel"
import { PlanningGrid } from "./dispatch-planning/planning-grid"
import { LoadCard } from "./dispatch-planning/load-card"
import { LoadDetailDialog } from "./dispatch-planning/load-detail-dialog"
import type { PlanningLoad, PlanningHorse, GridCellKey } from "@/types/planning"

export function DispatchPlanning() {
  const supabase = createClient()

  // Week state
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [viewMode, setViewMode] = useState<"week" | "month">("week")
  const [filterViewMode, setFilterViewMode] = useState<"all" | "customer" | "transporter">("all")
  const [resourceType, setResourceType] = useState<"horses" | "trailers" | "both">("both")

  // Data state
  const [loads, setLoads] = useState<PlanningLoad[]>([])
  const [horses, setHorses] = useState<PlanningHorse[]>([])
  const [drivers, setDrivers] = useState<{ id: string; first_name: string; last_name: string; transporter_id: string; status: string }[]>([])
  const [trailers, setTrailers] = useState<{ id: string; registration_number: string; trailer_type: string; transporter_id: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // DnD state
  const [activeLoad, setActiveLoad] = useState<PlanningLoad | null>(null)

  // Filter state
  const [clientFilter, setClientFilter] = useState("all")
  const [materialFilter, setMaterialFilter] = useState("all")
  const [transporterFilter, setTransporterFilter] = useState("all")
  const [panelSearchTerm, setPanelSearchTerm] = useState("")
  const [panelCollapsed, setPanelCollapsed] = useState(false)

  // Detail dialog state
  const [detailLoad, setDetailLoad] = useState<PlanningLoad | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // DnD sensors — 8px distance to differentiate click vs drag
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    const weekEnd = addDays(weekStart, 6)
    const startStr = format(weekStart, 'yyyy-MM-dd')
    const endStr = format(weekEnd, 'yyyy-MM-dd')

    const [loadsResult, horsesResult, driversResult, trailersResult] = await Promise.all([
      supabase
        .from("ceva_loads")
        .select(`
          id, load_number, order_number, client, origin, destination,
          pickup_date, delivery_date, material, weight, rate, status,
          supplier_id, horse_id, trailer_id, trailer2_id, driver_id, contract_id, notes,
          supplier:ceva_transporters!supplier_id(company_name, trading_name),
          horse:ceva_horses!horse_id(registration_number)
        `)
        .gte("pickup_date", startStr)
        .lte("pickup_date", endStr)
        .not("status", "in", '("delivered","cancelled")')
        .order("pickup_date", { ascending: true }),
      supabase
        .from("ceva_horses")
        .select(`
          id, registration_number, make, model, status, transporter_id,
          transporter:ceva_transporters!transporter_id(id, company_name, trading_name)
        `)
        .in("status", ["available", "in_use"])
        .order("registration_number", { ascending: true }),
      supabase
        .from("ceva_drivers")
        .select("id, first_name, last_name, transporter_id, status")
        .eq("status", "active")
        .order("first_name", { ascending: true }),
      supabase
        .from("ceva_trailers")
        .select("id, registration_number, trailer_type, transporter_id")
        .in("status", ["available", "in_use"])
        .order("registration_number", { ascending: true }),
    ])

    console.log("[DispatchPlanning] Week range:", startStr, "to", endStr)
    console.log("[DispatchPlanning] Loads result:", { data: loadsResult.data, error: loadsResult.error, count: loadsResult.data?.length })
    console.log("[DispatchPlanning] Horses result:", { data: horsesResult.data, error: horsesResult.error, count: horsesResult.data?.length })

    if (loadsResult.error) {
      console.error("[DispatchPlanning] Loads error:", loadsResult.error)
      setError(`Failed to load data: ${loadsResult.error.message}`)
      setLoading(false)
      return
    }
    if (horsesResult.error) {
      console.error("[DispatchPlanning] Horses error:", horsesResult.error)
      setError(`Failed to load vehicles: ${horsesResult.error.message}`)
      setLoading(false)
      return
    }

    setLoads((loadsResult.data || []) as PlanningLoad[])
    setHorses((horsesResult.data || []) as PlanningHorse[])
    setDrivers(driversResult.data || [])
    setTrailers(trailersResult.data || [])
    setLoading(false)
  }, [weekStart])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Derive unassigned loads and assigned loads map
  const unassignedLoads = useMemo(
    () => loads.filter((l) => !l.horse_id),
    [loads]
  )

  const assignedLoadsMap = useMemo(() => {
    const map = new Map<GridCellKey, PlanningLoad[]>()
    for (const load of loads) {
      // For loads with horses, group by horse + date
      if (load.horse_id) {
        const key = `${load.horse_id}:${load.pickup_date}` as GridCellKey
        const existing = map.get(key) || []
        existing.push(load)
        map.set(key, existing)
      } else {
        // For loads without horses, group by date only (for timeline view)
        const key = `no-horse:${load.pickup_date}` as GridCellKey
        const existing = map.get(key) || []
        existing.push(load)
        map.set(key, existing)
      }
    }
    return map
  }, [loads])

  // Filter horses for the grid
  const filteredHorses = useMemo(() => {
    return horses.filter((horse) => {
      return transporterFilter === "all" || horse.transporter_id === transporterFilter
    })
  }, [horses, transporterFilter])

  // Unique clients and transporters for filter dropdowns
  const uniqueClients = useMemo(
    () => [...new Set(loads.map((l) => l.client))].sort(),
    [loads]
  )
  const uniqueTransporters = useMemo(
    () =>
      [...new Map(
        horses.map((h) => [
          h.transporter.id,
          { id: h.transporter.id, name: h.transporter.trading_name || h.transporter.company_name },
        ])
      ).values()].sort((a, b) => a.name.localeCompare(b.name)),
    [horses]
  )

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const load = loads.find((l) => l.id === event.active.id)
    setActiveLoad(load || null)
  }, [loads])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    setActiveLoad(null)
    const { active, over } = event
    if (!over) return

    const loadId = active.id as string
    const targetId = over.id as string

    const load = loads.find((l) => l.id === loadId)
    if (!load) return

    // Determine source key
    const sourceKey = load.horse_id
      ? `${load.horse_id}:${load.pickup_date}`
      : load.pickup_date

    // Skip if same cell
    if (sourceKey === targetId) return

    // Snapshot for rollback
    const previousLoads = [...loads]

    // Check if target is just a date (no horses scenario)
    if (targetId.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Just rescheduling to a different date
      const newDate = targetId

      setLoads((prev) =>
        prev.map((l) =>
          l.id === loadId
            ? { ...l, pickup_date: newDate }
            : l
        )
      )

      const { error } = await supabase
        .from("ceva_loads")
        .update({ pickup_date: newDate })
        .eq("id", loadId)

      if (error) {
        setLoads(previousLoads)
        toast.error(`Failed to reschedule load: ${error.message}`)
      } else {
        toast.success(`Load rescheduled to ${format(new Date(newDate), 'EEE dd MMM yyyy')}`)
      }
      return
    }

    if (targetId === "unassigned") {
      // Unassign the load
      setLoads((prev) =>
        prev.map((l) =>
          l.id === loadId
            ? { ...l, horse_id: null, trailer_id: null, trailer2_id: null, supplier_id: null, status: "pending" as const, supplier: null, horse: null }
            : l
        )
      )

      const { error } = await supabase
        .from("ceva_loads")
        .update({
          horse_id: null,
          trailer_id: null,
          trailer2_id: null,
          supplier_id: null,
          status: "pending",
        })
        .eq("id", loadId)

      if (error) {
        setLoads(previousLoads)
        toast.error(`Failed to unassign load: ${error.message}`)
      } else {
        toast.success("Load moved to unassigned")
      }
    } else {
      // Assign to a cell — target format is "horseId:date"
      const [horseId, dateString] = targetId.split(':')
      const horse = horses.find((h) => h.id === horseId)
      if (!horse) return

      // Auto-assign a trailer from the same transporter if available
      const availableTrailer = trailers.find(
        (t) => t.transporter_id === horse.transporter_id
      )

      // Auto-assign a driver from the same transporter if available
      const availableDriver = drivers.find(
        (d) => d.transporter_id === horse.transporter_id && d.status === "active"
      )

      setLoads((prev) =>
        prev.map((l) =>
          l.id === loadId
            ? {
                ...l,
                pickup_date: dateString,
                horse_id: horse.id,
                trailer_id: availableTrailer?.id || null,
                driver_id: availableDriver?.id || null,
                supplier_id: horse.transporter_id,
                status: "assigned" as const,
                horse: { registration_number: horse.registration_number },
                supplier: { company_name: horse.transporter.company_name, trading_name: horse.transporter.trading_name },
              }
            : l
        )
      )

      const { error } = await supabase
        .from("ceva_loads")
        .update({
          pickup_date: dateString,
          horse_id: horse.id,
          trailer_id: availableTrailer?.id || null,
          driver_id: availableDriver?.id || null,
          supplier_id: horse.transporter_id,
          status: "assigned",
        })
        .eq("id", loadId)

      if (error) {
        setLoads(previousLoads)
        toast.error(`Failed to assign load: ${error.message}`)
      } else {
        const assignedItems = [
          horse.registration_number,
          availableTrailer ? `+ trailer ${availableTrailer.registration_number}` : '',
          availableDriver ? `+ driver ${availableDriver.first_name} ${availableDriver.last_name}` : ''
        ].filter(Boolean).join(' ')

        toast.success(
          `Load assigned to ${assignedItems} on ${format(new Date(dateString), 'EEE dd MMM')}`
        )
      }
    }
  }, [loads, horses, trailers, drivers, supabase])

  // Load click handler
  const handleLoadClick = useCallback((load: PlanningLoad) => {
    setDetailLoad(load)
    setDetailOpen(true)
  }, [])

  // Quick-assign handler for driver/trailers from the detail dialog
  const handleQuickAssign = useCallback(async (loadId: string, field: string, value: string | null) => {
    const previousLoads = [...loads]

    // Optimistic update
    setLoads((prev) =>
      prev.map((l) => (l.id === loadId ? { ...l, [field]: value } : l))
    )
    // Also update the detail dialog load
    setDetailLoad((prev) =>
      prev && prev.id === loadId ? { ...prev, [field]: value } : prev
    )

    const { error } = await supabase
      .from("ceva_loads")
      .update({ [field]: value || null })
      .eq("id", loadId)

    if (error) {
      setLoads(previousLoads)
      toast.error(`Failed to update: ${error.message}`)
    } else {
      toast.success("Assignment updated")
    }
  }, [loads])

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading dispatch planning...</span>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="flex items-center gap-2 text-destructive border border-destructive/30 rounded-lg p-4">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Top bar with view mode selector */}
      <div className="flex items-center justify-between gap-4 pb-3 flex-wrap">
        <WeekSelector
          currentWeekStart={weekStart}
          onWeekChange={setWeekStart}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <PlanningFilters
          clientFilter={clientFilter}
          onClientFilterChange={setClientFilter}
          materialFilter={materialFilter}
          onMaterialFilterChange={setMaterialFilter}
          transporterFilter={transporterFilter}
          onTransporterFilterChange={setTransporterFilter}
          clients={uniqueClients}
          transporters={uniqueTransporters}
        />
      </div>

      {/* Filter view tabs */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterViewMode("all")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              filterViewMode === "all"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All Clients
          </button>
          <button
            onClick={() => setFilterViewMode("customer")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              filterViewMode === "customer"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Customers
          </button>
          <button
            onClick={() => setFilterViewMode("transporter")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              filterViewMode === "transporter"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Transporters
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">View columns as:</span>
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              variant={resourceType === "both" ? "default" : "ghost"}
              size="sm"
              onClick={() => setResourceType("both")}
            >
              Horse + Trailer
            </Button>
            <Button
              variant={resourceType === "horses" ? "default" : "ghost"}
              size="sm"
              onClick={() => setResourceType("horses")}
            >
              Horses Only
            </Button>
            <Button
              variant={resourceType === "trailers" ? "default" : "ghost"}
              size="sm"
              onClick={() => setResourceType("trailers")}
            >
              Trailers Only
            </Button>
          </div>
        </div>
      </div>

      {/* Main area: unassigned panel + grid */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 min-h-0">
          <UnassignedLoadsPanel
            loads={unassignedLoads}
            searchTerm={panelSearchTerm}
            onSearchTermChange={setPanelSearchTerm}
            clientFilter={clientFilter}
            materialFilter={materialFilter}
            isCollapsed={panelCollapsed}
            onToggleCollapse={() => setPanelCollapsed((p) => !p)}
            onLoadClick={handleLoadClick}
          />
          <PlanningGrid
            weekStart={weekStart}
            horses={filteredHorses}
            assignedLoads={assignedLoadsMap}
            onLoadClick={handleLoadClick}
            viewMode={viewMode}
          />
        </div>

        <DragOverlay dropAnimation={null}>
          {activeLoad ? <LoadCard load={activeLoad} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Detail dialog */}
      <LoadDetailDialog
        load={detailLoad}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        drivers={drivers}
        trailers={trailers}
        onQuickAssign={handleQuickAssign}
      />
    </div>
  )
}
