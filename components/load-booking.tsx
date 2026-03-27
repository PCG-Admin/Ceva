"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  Weight,
  DollarSign,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Map,
  Copy,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Transporter, Horse, Trailer } from "@/types/transporter"
import { AddressInput } from "@/components/ui/address-input"
import type { LocationData, ClientAddress } from "@/types/location"
import { LoadRouteMap } from "@/components/load-route-map"

interface Contract {
  id: string
  contract_name: string
  weight_tons: number | null
}

interface Driver {
  id: string
  first_name: string
  last_name: string
  transporter_id: string
  status: string
}

interface Client {
  id: string
  name: string
  contact_number: string | null
  pickup_addresses: ClientAddress[]
  delivery_addresses: ClientAddress[]
}

interface Load {
  id: string
  load_number: string
  order_number: string
  loading_number: string | null
  offloading_number: string | null
  manifest_number: string | null // SOW 3.1.1 - Mandatory on pack
  rib_code: string | null // SOW 3.1.1 - Remover in Bond Code
  controller: string | null // SOW 3.1.1 - CEVA controller (e.g., Mahesh)
  passport_number: string | null // SOW 3.1.1 - Phytosanitary passport (optional)
  client: string
  client_contact: string | null
  origin: string
  destination: string
  origin_lat: number | null
  origin_lng: number | null
  dest_lat: number | null
  dest_lng: number | null
  pickup_date: string
  delivery_date: string
  weight: number | null
  material: string
  vehicle_type: string | null
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled"
  assigned_vehicle: string | null
  rate: number
  notes: string | null
  supplier_id: string | null
  horse_id: string | null
  trailer_id: string | null
  trailer2_id: string | null
  driver_id: string | null
  contract_id: string | null
  created_by: string
  created_at: string
  // Joined relations
  supplier?: { company_name: string; trading_name: string | null } | null
  horse?: { registration_number: string; make: string | null; model: string | null } | null
  trailer?: { registration_number: string; trailer_type: string } | null
  trailer2?: { registration_number: string; trailer_type: string } | null
  driver?: { first_name: string; last_name: string; contact_phone: string | null } | null
  contract?: { contract_name: string; weight_tons: number | null } | null
}

interface LoadStats {
  total: number
  pending: number
  inTransit: number
  revenue: number
}

// Material type options (SOW: Default is Citrus for CEVA module)
const MATERIAL_TYPES = [
  { value: "citrus", label: "Citrus" }, // SOW Section 3.1.1 - Default for CEVA
  { value: "coal", label: "Coal" },
  { value: "chrome", label: "Chrome" },
  { value: "manganese", label: "Manganese" },
  { value: "iron_ore", label: "Iron Ore" },
  { value: "limestone", label: "Limestone" },
  { value: "sand", label: "Sand" },
  { value: "gravel", label: "Gravel" },
  { value: "cement", label: "Cement" },
  { value: "fertilizer", label: "Fertilizer" },
  { value: "grain", label: "Grain" },
  { value: "maize", label: "Maize" },
  { value: "sugar", label: "Sugar" },
  { value: "other", label: "Other" },
] as const

export function LoadBooking() {
  const [loads, setLoads] = useState<Load[]>([])
  const [stats, setStats] = useState<LoadStats>({ total: 0, pending: 0, inTransit: 0, revenue: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingLoad, setEditingLoad] = useState<Load | null>(null)
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchLoads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_loads")
      .select(`
        *,
        supplier:ceva_transporters!supplier_id(company_name, trading_name),
        horse:ceva_horses!horse_id(registration_number, make, model),
        trailer:ceva_trailers!trailer_id(registration_number, trailer_type),
        trailer2:ceva_trailers!trailer2_id(registration_number, trailer_type),
        driver:ceva_drivers!driver_id(first_name, last_name, contact_phone),
        contract:ceva_contracts!contract_id(contract_name, weight_tons)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching loads:", error)
    } else {
      setLoads(data || [])

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const allLoads = data || []
      const monthLoads = allLoads.filter((l) => l.created_at >= monthStart)
      setStats({
        total: allLoads.length,
        pending: allLoads.filter((l) => l.status === "pending").length,
        inTransit: allLoads.filter((l) => l.status === "in_transit").length,
        revenue: monthLoads
          .filter((l) => l.status === "delivered")
          .reduce((sum, l) => sum + Number(l.rate), 0),
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchLoads()
  }, [fetchLoads])

  const handleDelete = async (id: string) => {
    // Find the load to get its contract and weight info
    const loadToDelete = loads.find(l => l.id === id)

    // If the load has a contract and weight, add the weight back to the contract
    if (loadToDelete?.contract_id && loadToDelete?.weight) {
      // Fetch current contract weight
      const { data: contract } = await supabase
        .from("ceva_contracts")
        .select("weight_tons")
        .eq("id", loadToDelete.contract_id)
        .single()

      if (contract && contract.weight_tons !== null) {
        await supabase
          .from("ceva_contracts")
          .update({ weight_tons: contract.weight_tons + loadToDelete.weight })
          .eq("id", loadToDelete.contract_id)
      }
    }

    const { error } = await supabase.from("ceva_loads").delete().eq("id", id)
    if (error) {
      console.error("Error deleting load:", error)
      return
    }
    fetchLoads()
  }

  const handleStatusChange = async (id: string, newStatus: Load["status"]) => {
    const { error } = await supabase
      .from("ceva_loads")
      .update({ status: newStatus })
      .eq("id", id)

    if (error) {
      console.error("Error updating load status:", error)
      return
    }

    // Update local state immediately for better UX
    setLoads(prev => prev.map(load =>
      load.id === id ? { ...load, status: newStatus } : load
    ))

  }

  const handleDuplicate = async (load: Load) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from("ceva_loads").insert({
      client: load.client,
      client_contact: load.client_contact,
      material: load.material,
      manifest_number: load.manifest_number,
      rib_code: load.rib_code,
      controller: load.controller,
      passport_number: load.passport_number,
      origin: load.origin,
      destination: load.destination,
      origin_lat: load.origin_lat ?? null,
      origin_lng: load.origin_lng ?? null,
      dest_lat: load.dest_lat ?? null,
      dest_lng: load.dest_lng ?? null,
      pickup_date: load.pickup_date,
      delivery_date: load.delivery_date,
      weight: load.weight,
      rate: load.rate,
      notes: load.notes,
      loading_number: load.loading_number,
      offloading_number: load.offloading_number,
      supplier_id: load.supplier_id,
      horse_id: load.horse_id,
      trailer_id: load.trailer_id,
      trailer2_id: load.trailer2_id,
      driver_id: load.driver_id,
      contract_id: load.contract_id,
      vehicle_type: load.vehicle_type,
      created_by: user.id,
    })

    if (error) {
      console.error("Error duplicating load:", error)
      return
    }
    fetchLoads()
  }

  const filteredLoads = loads.filter((load) => {
    const matchesSearch =
      load.load_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.destination.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || load.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000) return `R${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `R${(amount / 1_000).toFixed(0)}K`
    return `R${amount.toLocaleString("en-ZA")}`
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Loads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Assignment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires vehicle</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">Active deliveries</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Load Management</CardTitle>
              <CardDescription>Create, track, and manage all load bookings</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Load
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Load</DialogTitle>
                  <DialogDescription>Enter load details and assign to available vehicle</DialogDescription>
                </DialogHeader>
                <CreateLoadForm
                  onClose={() => setIsCreateDialogOpen(false)}
                  onSuccess={() => {
                    setIsCreateDialogOpen(false)
                    fetchLoads()
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>
          <div className="flex gap-2 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by load number, client, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLoads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No loads found</p>
              <p className="text-sm mt-1">Create a new load to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLoads.map((load) => (
                <LoadCard
                  key={load.id}
                  load={load}
                  onDelete={handleDelete}
                  onEdit={setEditingLoad}
                  onStatusChange={handleStatusChange}
                  onDuplicate={handleDuplicate}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Load Dialog */}
      <Dialog open={editingLoad !== null} onOpenChange={(open) => { if (!open) setEditingLoad(null) }}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Load {editingLoad?.order_number}</DialogTitle>
            <DialogDescription>Update load details</DialogDescription>
          </DialogHeader>
          {editingLoad && (
            <EditLoadForm
              load={editingLoad}
              onClose={() => setEditingLoad(null)}
              onSuccess={() => {
                setEditingLoad(null)
                fetchLoads()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function LoadCard({
  load,
  onDelete,
  onEdit,
  onStatusChange,
  onDuplicate,
}: {
  load: Load
  onDelete: (id: string) => void
  onEdit: (load: Load) => void
  onStatusChange: (id: string, status: Load["status"]) => void
  onDuplicate: (load: Load) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [showRoute, setShowRoute] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-accent/5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{load.order_number}</p>
                <p className="text-sm text-muted-foreground">{load.client}</p>
              </div>
            </div>
            <LoadStatusSelector
              status={load.status}
              onStatusChange={(newStatus) => onStatusChange(load.id, newStatus)}
            />
          </div>

          {/* Route Info */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-accent mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Origin</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-foreground">{load.origin}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(load.origin)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Open in Google Maps"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Destination</p>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-foreground">{load.destination}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(load.destination)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    title="Open in Google Maps"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Load Details */}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Pickup</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(load.pickup_date).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Weight className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Weight</p>
                <p className="text-sm font-medium text-foreground">{load.weight} t</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Rate</p>
                <p className="text-sm font-medium text-foreground">R{Number(load.rate).toLocaleString("en-ZA")}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Supplier</p>
                <p className="text-sm font-medium text-foreground">
                  {load.supplier ? (load.supplier.trading_name || load.supplier.company_name) : "Not assigned"}
                </p>
              </div>
            </div>
          </div>

          {/* Vehicle Assignment Details */}
          {(load.horse || load.trailer || load.driver) && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-accent/10 p-2">
              {load.driver && (
                <div className="flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span className="text-sm text-foreground">
                    <span className="text-muted-foreground">Driver:</span>{" "}
                    <span className="font-medium">{load.driver.first_name} {load.driver.last_name}</span>
                  </span>
                </div>
              )}
              {load.horse && (
                <div className="flex items-center gap-1.5">
                  <Truck className="h-4 w-4 text-accent" />
                  <span className="text-sm text-foreground">
                    <span className="text-muted-foreground">Horse:</span>{" "}
                    <span className="font-medium">{load.horse.registration_number}</span>
                    {load.horse.make && <span className="text-muted-foreground"> ({load.horse.make}{load.horse.model ? ` ${load.horse.model}` : ''})</span>}
                  </span>
                </div>
              )}
              {load.trailer && (
                <div className="flex items-center gap-1.5">
                  <Package className="h-4 w-4 text-accent" />
                  <span className="text-sm text-foreground">
                    <span className="text-muted-foreground">Trailer:</span>{" "}
                    <span className="font-medium">{load.trailer.registration_number}</span>
                    <span className="text-muted-foreground"> ({load.trailer.trailer_type})</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Missing Assignment Warnings */}
          {load.horse && (!load.trailer || !load.driver) && (
            <div className="flex flex-wrap items-center gap-3 rounded-md bg-destructive/10 p-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm text-destructive">
                Missing:{" "}
                {[
                  !load.trailer && "Trailer",
                  !load.driver && "Driver",
                ].filter(Boolean).join(", ")}
              </span>
            </div>
          )}

          {/* Route Map */}
          {showRoute && (
            <LoadRouteMap origin={load.origin} destination={load.destination} />
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowRoute(!showRoute)}
            title={showRoute ? "Hide route" : "View route"}
          >
            <Map className={`h-4 w-4 ${showRoute ? "text-primary" : ""}`} />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onDuplicate(load)} title="Duplicate load">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => onEdit(load)}>
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {load.order_number}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this load for {load.client} ({load.origin} to {load.destination}). This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setDeleting(true)
                    await onDelete(load.id)
                    setDeleting(false)
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
}

const STATUS_CONFIG = {
  pending: { label: "Pending", className: "bg-orange-500 text-white hover:bg-orange-600", hoverClassName: "hover:!bg-orange-500 focus:!bg-orange-500 hover:!text-white focus:!text-white", icon: AlertCircle },
  assigned: { label: "Assigned", className: "bg-secondary text-secondary-foreground hover:bg-secondary/90", hoverClassName: "hover:!bg-secondary focus:!bg-secondary hover:!text-secondary-foreground focus:!text-secondary-foreground", icon: CheckCircle },
  in_transit: { label: "In Transit", className: "bg-accent text-accent-foreground hover:bg-accent/90", hoverClassName: "hover:!bg-accent focus:!bg-accent hover:!text-accent-foreground focus:!text-accent-foreground", icon: Truck },
  delivered: { label: "Delivered", className: "bg-primary text-primary-foreground hover:bg-primary/90", hoverClassName: "hover:!bg-primary focus:!bg-primary hover:!text-primary-foreground focus:!text-primary-foreground", icon: CheckCircle },
  cancelled: { label: "Cancelled", className: "bg-destructive text-destructive-foreground hover:bg-destructive/90", hoverClassName: "hover:!bg-destructive focus:!bg-destructive hover:!text-destructive-foreground focus:!text-destructive-foreground", icon: XCircle },
}

function LoadStatusBadge({ status }: { status: Load["status"] }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

function LoadStatusSelector({
  status,
  onStatusChange,
  disabled = false
}: {
  status: Load["status"]
  onStatusChange: (newStatus: Load["status"]) => void
  disabled?: boolean
}) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const allStatuses: Load["status"][] = ["pending", "assigned", "in_transit", "delivered", "cancelled"]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button className="focus:outline-none" onClick={(e) => e.stopPropagation()}>
          <Badge className={`${config.className} cursor-pointer`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        {allStatuses.map((s) => {
          const sConfig = STATUS_CONFIG[s]
          const SIcon = sConfig.icon
          return (
            <DropdownMenuItem
              key={s}
              onClick={() => onStatusChange(s)}
              className={`transition-colors ${s === status ? "bg-accent" : ""} ${sConfig.hoverClassName}`}
            >
              <SIcon className="h-4 w-4 mr-2" />
              {sConfig.label}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function LoadFormFields({
  defaults,
  supplierId,
  setSupplierId,
  horseId,
  setHorseId,
  trailerId,
  setTrailerId,
  trailer2Id,
  setTrailer2Id,
  driverId,
  setDriverId,
  contractId,
  setContractId,
  weight,
  setWeight,
  origin,
  setOrigin,
  destination,
  setDestination,
  transporters,
  horses,
  trailers,
  drivers,
  contracts,
  clients,
  selectedClientId,
  setSelectedClientId,
  clientName,
  setClientName,
  clientContact,
  setClientContact,
  material,
  setMaterial,
  status,
  setStatus,
  showStatus,
}: {
  defaults?: Partial<Load>
  supplierId: string
  setSupplierId: (v: string) => void
  horseId: string
  setHorseId: (v: string) => void
  trailerId: string
  setTrailerId: (v: string) => void
  trailer2Id: string
  setTrailer2Id: (v: string) => void
  driverId: string
  setDriverId: (v: string) => void
  contractId: string
  setContractId: (v: string) => void
  weight: string
  setWeight: (v: string) => void
  origin: string
  setOrigin: (location: LocationData) => void
  destination: string
  setDestination: (location: LocationData) => void
  transporters: Transporter[]
  horses: Horse[]
  trailers: Trailer[]
  drivers: Driver[]
  contracts: Contract[]
  clients: Client[]
  selectedClientId: string
  setSelectedClientId: (v: string) => void
  clientName: string
  setClientName: (v: string) => void
  clientContact: string
  setClientContact: (v: string) => void
  material: string
  setMaterial: (v: string) => void
  status?: Load["status"]
  setStatus?: (s: Load["status"]) => void
  showStatus?: boolean
}) {
  // Filter horses, trailers and drivers based on selected supplier
  const filteredHorses = supplierId ? horses.filter(h => h.transporter_id === supplierId) : []
  const filteredTrailers = supplierId ? trailers.filter(t => t.transporter_id === supplierId) : []
  const filteredDrivers = supplierId ? drivers.filter(d => d.transporter_id === supplierId && d.status === "active") : []

  // Get selected client for saved address dropdowns
  const selectedClient = selectedClientId && selectedClientId !== "none"
    ? clients.find(c => c.id === selectedClientId) || null
    : null

  // Reset horse, trailers and driver when supplier changes
  const handleSupplierChange = (value: string) => {
    setSupplierId(value)
    setHorseId("")
    setTrailerId("")
    setTrailer2Id("")
    setDriverId("")
  }

  // Handle contract selection - set weight to 34 tons default
  const handleContractChange = (value: string) => {
    setContractId(value)
    setWeight("34") // Default 34 tons when contract is selected
  }

  // Handle client selection - auto-populate contact and destination
  const handleClientChange = (value: string) => {
    setSelectedClientId(value)
    if (value === "none") {
      setClientName("")
      setClientContact("")
      return
    }
    const selectedClient = clients.find(c => c.id === value)
    if (selectedClient) {
      setClientName(selectedClient.name)
      setClientContact(selectedClient.contact_number || "")
    }
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="loadingNumber">Loading Number</Label>
          <Input id="loadingNumber" name="loadingNumber" placeholder="e.g., LDG-001" defaultValue={defaults?.loading_number ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="offloadingNumber">Offloading Number</Label>
          <Input id="offloadingNumber" name="offloadingNumber" placeholder="e.g., OFF-001" defaultValue={defaults?.offloading_number ?? ""} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="client">Client *</Label>
          <Select value={selectedClientId || "none"} onValueChange={handleClientChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select client" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">-- Select client --</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="client" value={clientName} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="clientContact">Client Contact</Label>
          <Input
            id="clientContact"
            name="clientContact"
            type="tel"
            placeholder="e.g., 082 123 4567"
            value={clientContact}
            onChange={(e) => setClientContact(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Material Type *</Label>
          <Select value={material} onValueChange={setMaterial} required>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select material type" />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SOW Section 3.1.1 - Citrus-specific fields */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="manifestNumber">Manifest Number</Label>
          <Input
            id="manifestNumber"
            name="manifestNumber"
            placeholder="e.g., I325600001NT"
            defaultValue={defaults?.manifest_number ?? ""}
          />
          <p className="text-xs text-muted-foreground">Farm-allocated reference (added when available)</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ribCode">RiB Code</Label>
          <Input
            id="ribCode"
            name="ribCode"
            placeholder="e.g., 25616711"
            defaultValue={defaults?.rib_code ?? ""}
          />
          <p className="text-xs text-muted-foreground">Remover in Bond code for cross-border loads</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="controller">Controller</Label>
          <Input
            id="controller"
            name="controller"
            placeholder="e.g., Mahesh"
            defaultValue={defaults?.controller ?? ""}
          />
          <p className="text-xs text-muted-foreground">CEVA controller assigned to this load</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="passportNumber">Passport Number (Optional)</Label>
        <Input
          id="passportNumber"
          name="passportNumber"
          placeholder="Phytosanitary / export passport number"
          defaultValue={defaults?.passport_number ?? ""}
        />
      </div>

      <div className="space-y-2">
        {selectedClient && selectedClient.pickup_addresses.length > 0 && (
          <div className="space-y-1">
            <Label>Use Saved Pickup Address</Label>
            <Select
              value=""
              onValueChange={(value) => {
                setOrigin({ address: value, coordinates: null })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a saved pickup address" />
              </SelectTrigger>
              <SelectContent>
                {selectedClient.pickup_addresses.map((addr, i) => (
                  <SelectItem key={i} value={addr.address}>
                    {addr.label ? `${addr.label} — ${addr.address}` : addr.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <AddressInput
          id="origin"
          name="origin"
          label="Origin Address"
          value={origin}
          onChange={setOrigin}
          placeholder="Pickup location"
          required
        />
      </div>

      <div className="space-y-2">
        {selectedClient && selectedClient.delivery_addresses.length > 0 && (
          <div className="space-y-1">
            <Label>Use Saved Delivery Address</Label>
            <Select
              value=""
              onValueChange={(value) => {
                setDestination({ address: value, coordinates: null })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a saved delivery address" />
              </SelectTrigger>
              <SelectContent>
                {selectedClient.delivery_addresses.map((addr, i) => (
                  <SelectItem key={i} value={addr.address}>
                    {addr.label ? `${addr.label} — ${addr.address}` : addr.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <AddressInput
          id="destination"
          name="destination"
          label="Destination Address"
          value={destination}
          onChange={setDestination}
          placeholder="Delivery location"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pickupDate">Pickup Date *</Label>
          <Input id="pickupDate" name="pickupDate" type="date" defaultValue={defaults?.pickup_date ?? ""} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deliveryDate">Expected Delivery Date *</Label>
          <Input id="deliveryDate" name="deliveryDate" type="date" defaultValue={defaults?.delivery_date ?? ""} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contract">Contract</Label>
        <Select value={contractId} onValueChange={handleContractChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select contract (optional)" />
          </SelectTrigger>
          <SelectContent>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.contract_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="weight">Weight (tons)</Label>
          <Input
            id="weight"
            name="weight"
            type="number"
            step="0.01"
            placeholder="Enter weight"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rate">Rate (R) *</Label>
          <Input id="rate" name="rate" type="number" placeholder="Enter freight rate" defaultValue={defaults?.rate ?? ""} required />
        </div>
      </div>

      {/* Supplier / Horse / Trailer Assignment (Optional) */}
      <div className="space-y-4 pt-2 border-t">
        <p className="text-sm text-muted-foreground">Vehicle Assignment (Optional)</p>
        <div className="space-y-2">
          <Label htmlFor="supplier">Supplier</Label>
          <Select value={supplierId} onValueChange={handleSupplierChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              {transporters.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.company_name}{t.trading_name ? ` (${t.trading_name})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="horse">Horse</Label>
            <Select value={horseId} onValueChange={setHorseId} disabled={!supplierId}>
              <SelectTrigger>
                <SelectValue placeholder={supplierId ? "Select horse" : "Select supplier first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredHorses.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.registration_number}{h.make ? ` - ${h.make}` : ''}{h.model ? ` ${h.model}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trailer">Trailer 1</Label>
            <Select value={trailerId} onValueChange={setTrailerId} disabled={!supplierId}>
              <SelectTrigger>
                <SelectValue placeholder={supplierId ? "Select trailer" : "Select supplier first"} />
              </SelectTrigger>
              <SelectContent>
                {filteredTrailers.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.registration_number} - {t.trailer_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="trailer2">Trailer 2 (Optional)</Label>
            <Select value={trailer2Id || "none"} onValueChange={(v) => setTrailer2Id(v === "none" ? "" : v)} disabled={!supplierId}>
              <SelectTrigger>
                <SelectValue placeholder={supplierId ? "Select second trailer" : "Select supplier first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredTrailers
                  .filter((t) => t.id !== trailerId)
                  .map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.registration_number} - {t.trailer_type}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="driver">Driver</Label>
            <Select value={driverId || "none"} onValueChange={(v) => setDriverId(v === "none" ? "" : v)} disabled={!supplierId}>
              <SelectTrigger>
                <SelectValue placeholder={supplierId ? "Select driver" : "Select supplier first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {filteredDrivers.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.first_name} {d.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {showStatus && setStatus && (
        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as Load["status"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="assigned">Assigned</SelectItem>
              <SelectItem value="in-transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea id="notes" name="notes" placeholder="Special instructions, handling requirements, etc." rows={3} defaultValue={defaults?.notes ?? ""} />
      </div>
    </>
  )
}

function CreateLoadForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supplierId, setSupplierId] = useState("")
  const [horseId, setHorseId] = useState("")
  const [trailerId, setTrailerId] = useState("")
  const [trailer2Id, setTrailer2Id] = useState("")
  const [driverId, setDriverId] = useState("")
  const [contractId, setContractId] = useState("")
  const [weight, setWeight] = useState("")
  const [material, setMaterial] = useState("citrus") // SOW: Default to Citrus for CEVA module
  const [origin, setOriginAddress] = useState("")
  const [destination, setDestinationAddress] = useState("")
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [transporters, setTransporters] = useState<Transporter[]>([])
  const [horses, setHorses] = useState<Horse[]>([])
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [clientName, setClientName] = useState("")
  const [clientContact, setClientContact] = useState("")
  const [loadingData, setLoadingData] = useState(true)

  const handleOriginChange = (location: LocationData) => {
    setOriginAddress(location.address)
    setOriginCoords(location.coordinates ?? null)
  }

  const handleDestinationChange = (location: LocationData) => {
    setDestinationAddress(location.address)
    setDestinationCoords(location.coordinates ?? null)
  }

  const supabase = createClient()

  // Fetch transporters, horses, trailers, contracts, and clients
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      const [transportersRes, horsesRes, trailersRes, driversRes, contractsRes, clientsRes] = await Promise.all([
        supabase.from("ceva_transporters").select("*").neq("status", "suspended").order("company_name"),
        supabase.from("ceva_horses").select("*").eq("status", "available").order("registration_number"),
        supabase.from("ceva_trailers").select("*").eq("status", "available").order("registration_number"),
        supabase.from("ceva_drivers").select("id, first_name, last_name, transporter_id, status").eq("status", "active").order("first_name"),
        supabase.from("ceva_contracts").select("id, contract_name, weight_tons").order("contract_name"),
        supabase.from("ceva_clients").select("id, name, contact_number, pickup_addresses, delivery_addresses").order("name"),
      ])

      if (transportersRes.data) setTransporters(transportersRes.data)
      if (horsesRes.data) setHorses(horsesRes.data)
      if (trailersRes.data) setTrailers(trailersRes.data)
      if (driversRes.data) setDrivers(driversRes.data)
      if (contractsRes.data) setContracts(contractsRes.data)
      if (clientsRes.data) setClients(clientsRes.data)
      setLoadingData(false)
    }
    fetchData()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const formData = new FormData(e.currentTarget)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("You must be logged in to create a load.")
      setSubmitting(false)
      return
    }

    if (!clientName) {
      setError("Please select a client.")
      setSubmitting(false)
      return
    }

    // Auto-set status to "assigned" if a horse is selected
    const autoStatus = horseId ? "assigned" : "pending"

    const { error: insertError } = await supabase.from("ceva_loads").insert({
      loading_number: (formData.get("loadingNumber") as string) || null,
      offloading_number: (formData.get("offloadingNumber") as string) || null,
      manifest_number: (formData.get("manifestNumber") as string) || null,
      rib_code: (formData.get("ribCode") as string) || null,
      controller: (formData.get("controller") as string) || null,
      passport_number: (formData.get("passportNumber") as string) || null,
      client: clientName,
      client_id: selectedClientId && selectedClientId !== "none" ? selectedClientId : null,
      client_contact: clientContact || null,
      material: material,
      commodity: material === "citrus" ? "Citrus" : null, // SOW: commodity field
      origin: origin,
      destination: destination,
      origin_lat: originCoords?.lat ?? null,
      origin_lng: originCoords?.lng ?? null,
      dest_lat: destinationCoords?.lat ?? null,
      dest_lng: destinationCoords?.lng ?? null,
      pickup_date: formData.get("pickupDate") as string,
      delivery_date: formData.get("deliveryDate") as string,
      weight: weight ? Number(weight) : null,
      rate: Number(formData.get("rate")),
      notes: (formData.get("notes") as string) || null,
      status: autoStatus,
      supplier_id: supplierId || null,
      horse_id: horseId || null,
      trailer_id: trailerId || null,
      trailer2_id: trailer2Id || null,
      driver_id: driverId || null,
      contract_id: contractId || null,
      created_by: user.id,
    })

    if (insertError) {
      console.error("Error creating load:", insertError)
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    // Deduct weight from contract if a contract is selected and weight is provided
    if (contractId && weight) {
      const selectedContract = contracts.find(c => c.id === contractId)

      if (selectedContract && selectedContract.weight_tons !== null) {
        const newWeightTons = selectedContract.weight_tons - Number(weight)

        const { error: updateError } = await supabase
          .from("ceva_contracts")
          .update({ weight_tons: newWeightTons })
          .eq("id", contractId)

        if (updateError) {
          console.error("Error updating contract weight:", updateError)
          // Load was created successfully, so we don't fail the entire operation
          // but log the error for debugging
        }
      }
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {loadingData ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LoadFormFields
          supplierId={supplierId}
          setSupplierId={setSupplierId}
          horseId={horseId}
          setHorseId={setHorseId}
          trailerId={trailerId}
          setTrailerId={setTrailerId}
          trailer2Id={trailer2Id}
          setTrailer2Id={setTrailer2Id}
          driverId={driverId}
          setDriverId={setDriverId}
          contractId={contractId}
          setContractId={setContractId}
          weight={weight}
          setWeight={setWeight}
          material={material}
          setMaterial={setMaterial}
          origin={origin}
          setOrigin={handleOriginChange}
          destination={destination}
          setDestination={handleDestinationChange}
          transporters={transporters}
          horses={horses}
          trailers={trailers}
          drivers={drivers}
          contracts={contracts}
          clients={clients}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
          clientName={clientName}
          setClientName={setClientName}
          clientContact={clientContact}
          setClientContact={setClientContact}
        />
      )}
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || loadingData}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Load
        </Button>
      </DialogFooter>
    </form>
  )
}

function EditLoadForm({ load, onClose, onSuccess }: { load: Load; onClose: () => void; onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState(load.status)
  const [supplierId, setSupplierId] = useState(load.supplier_id || "")
  const [horseId, setHorseId] = useState(load.horse_id || "")
  const [trailerId, setTrailerId] = useState(load.trailer_id || "")
  const [trailer2Id, setTrailer2Id] = useState(load.trailer2_id || "")
  const [driverId, setDriverId] = useState(load.driver_id || "")
  const [contractId, setContractId] = useState(load.contract_id || "")
  const [weight, setWeight] = useState(load.weight ? String(load.weight) : "")
  const [material, setMaterial] = useState(load.material || "")
  const [origin, setOriginAddress] = useState(load.origin || "")
  const [destination, setDestinationAddress] = useState(load.destination || "")
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(
    load.origin_lat != null && load.origin_lng != null ? { lat: load.origin_lat, lng: load.origin_lng } : null
  )
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(
    load.dest_lat != null && load.dest_lng != null ? { lat: load.dest_lat, lng: load.dest_lng } : null
  )
  const [transporters, setTransporters] = useState<Transporter[]>([])
  const [horses, setHorses] = useState<Horse[]>([])
  const [trailers, setTrailers] = useState<Trailer[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState("")
  const [clientName, setClientName] = useState(load.client || "")
  const [clientContact, setClientContact] = useState(load.client_contact || "")
  const [loadingData, setLoadingData] = useState(true)

  const handleOriginChange = (location: LocationData) => {
    setOriginAddress(location.address)
    setOriginCoords(location.coordinates ?? null)
  }

  const handleDestinationChange = (location: LocationData) => {
    setDestinationAddress(location.address)
    setDestinationCoords(location.coordinates ?? null)
  }

  const supabase = createClient()

  // Fetch transporters, horses, trailers, contracts, and clients
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      const [transportersRes, horsesRes, trailersRes, driversRes, contractsRes, clientsRes] = await Promise.all([
        supabase.from("ceva_transporters").select("*").neq("status", "suspended").order("company_name"),
        supabase.from("ceva_horses").select("*").order("registration_number"),
        supabase.from("ceva_trailers").select("*").order("registration_number"),
        supabase.from("ceva_drivers").select("id, first_name, last_name, transporter_id, status").order("first_name"),
        supabase.from("ceva_contracts").select("id, contract_name, weight_tons").order("contract_name"),
        supabase.from("ceva_clients").select("id, name, contact_number, pickup_addresses, delivery_addresses").order("name"),
      ])

      if (transportersRes.data) setTransporters(transportersRes.data)
      if (horsesRes.data) setHorses(horsesRes.data)
      if (trailersRes.data) setTrailers(trailersRes.data)
      if (driversRes.data) setDrivers(driversRes.data)
      if (contractsRes.data) setContracts(contractsRes.data)
      if (clientsRes.data) {
        setClients(clientsRes.data)
        // Try to find the matching client by name
        const matchingClient = clientsRes.data.find(c => c.name === load.client)
        if (matchingClient) {
          setSelectedClientId(matchingClient.id)
        }
      }
      setLoadingData(false)
    }
    fetchData()
  }, [supabase, load.client])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    if (!clientName) {
      setError("Please select a client.")
      setSubmitting(false)
      return
    }

    const formData = new FormData(e.currentTarget)

    // Auto-update status based on assignment:
    // - If horse assigned and status is still "pending", move to "assigned"
    // - If horse removed and status is "assigned", move back to "pending"
    // - Otherwise keep the manually selected status (don't override in_transit/delivered/cancelled)
    let resolvedStatus = status
    if (horseId && status === "pending") {
      resolvedStatus = "assigned"
    } else if (!horseId && status === "assigned") {
      resolvedStatus = "pending"
    }

    const { error: updateError } = await supabase
      .from("ceva_loads")
      .update({
        loading_number: (formData.get("loadingNumber") as string) || null,
        offloading_number: (formData.get("offloadingNumber") as string) || null,
        client: clientName,
        client_id: selectedClientId && selectedClientId !== "none" ? selectedClientId : null,
        client_contact: clientContact || null,
        material: material,
        origin: origin,
        destination: destination,
        origin_lat: originCoords?.lat ?? null,
        origin_lng: originCoords?.lng ?? null,
        dest_lat: destinationCoords?.lat ?? null,
        dest_lng: destinationCoords?.lng ?? null,
        pickup_date: formData.get("pickupDate") as string,
        delivery_date: formData.get("deliveryDate") as string,
        weight: weight ? Number(weight) : null,
        rate: Number(formData.get("rate")),
        notes: (formData.get("notes") as string) || null,
        status: resolvedStatus,
        supplier_id: supplierId || null,
        horse_id: horseId || null,
        trailer_id: trailerId || null,
        trailer2_id: trailer2Id || null,
        driver_id: driverId || null,
        contract_id: contractId || null,
      })
      .eq("id", load.id)

    if (updateError) {
      console.error("Error updating load:", updateError)
      setError(updateError.message)
      setSubmitting(false)
      return
    }

    // Handle contract weight adjustments
    const oldContractId = load.contract_id
    const oldWeight = load.weight
    const newContractId = contractId || null
    const newWeight = weight ? Number(weight) : null

    // Case 1: Contract changed or removed - add weight back to old contract
    if (oldContractId && oldContractId !== newContractId && oldWeight) {
      const oldContract = contracts.find(c => c.id === oldContractId)
      if (oldContract && oldContract.weight_tons !== null) {
        await supabase
          .from("ceva_contracts")
          .update({ weight_tons: oldContract.weight_tons + oldWeight })
          .eq("id", oldContractId)
      }
    }

    // Case 2: Contract changed or added - deduct weight from new contract
    if (newContractId && oldContractId !== newContractId && newWeight) {
      const newContract = contracts.find(c => c.id === newContractId)
      if (newContract && newContract.weight_tons !== null) {
        await supabase
          .from("ceva_contracts")
          .update({ weight_tons: newContract.weight_tons - newWeight })
          .eq("id", newContractId)
      }
    }

    // Case 3: Same contract, weight changed - adjust by the difference
    if (newContractId && oldContractId === newContractId && oldWeight !== newWeight) {
      const weightDifference = (newWeight ?? 0) - (oldWeight ?? 0)
      const contract = contracts.find(c => c.id === newContractId)
      if (contract && contract.weight_tons !== null) {
        await supabase
          .from("ceva_contracts")
          .update({ weight_tons: contract.weight_tons - weightDifference })
          .eq("id", newContractId)
      }
    }

    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}
      {loadingData ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <LoadFormFields
          defaults={load}
          supplierId={supplierId}
          setSupplierId={setSupplierId}
          horseId={horseId}
          setHorseId={setHorseId}
          trailerId={trailerId}
          setTrailerId={setTrailerId}
          trailer2Id={trailer2Id}
          setTrailer2Id={setTrailer2Id}
          driverId={driverId}
          setDriverId={setDriverId}
          contractId={contractId}
          setContractId={setContractId}
          weight={weight}
          setWeight={setWeight}
          material={material}
          setMaterial={setMaterial}
          origin={origin}
          setOrigin={handleOriginChange}
          destination={destination}
          setDestination={handleDestinationChange}
          transporters={transporters}
          horses={horses}
          trailers={trailers}
          drivers={drivers}
          contracts={contracts}
          clients={clients}
          selectedClientId={selectedClientId}
          setSelectedClientId={setSelectedClientId}
          clientName={clientName}
          setClientName={setClientName}
          clientContact={clientContact}
          setClientContact={setClientContact}
          status={status}
          setStatus={setStatus}
          showStatus
        />
      )}
      <DialogFooter>
        <Button variant="outline" type="button" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || loadingData}>
          {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </DialogFooter>
    </form>
  )
}
