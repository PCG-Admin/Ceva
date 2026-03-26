"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Package,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Truck,
  LogOut,
  Navigation,
  Phone,
  FileText,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { toast } from "sonner"

interface DriverLoad {
  id: string
  load_number: string
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled"
  origin: string
  destination: string
  pickup_date: string
  delivery_date: string
  notes?: string
  vehicle_registration?: string
  trailer_registration?: string
  vehicle_location?: string
  client_company?: string
  created_at: string
  updated_at: string
}

interface DriverPortalContentProps {
  user: any
  profile: any
  driverDetails: any
}

export function DriverPortalContent({ user, profile, driverDetails }: DriverPortalContentProps) {
  const supabase = createClient()
  const router = useRouter()

  const [loads, setLoads] = useState<DriverLoad[]>([])
  const [selectedLoad, setSelectedLoad] = useState<DriverLoad | null>(null)
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Status update form
  const [newStatus, setNewStatus] = useState<string>("")
  const [statusNotes, setStatusNotes] = useState("")

  // Stats
  const [stats, setStats] = useState({
    activeLoads: 0,
    completedToday: 0,
    pendingPickup: 0,
  })

  useEffect(() => {
    fetchLoads()
  }, [])

  const fetchLoads = async () => {
    setLoading(true)
    try {
      // Fetch loads using the driver_load_summary view
      const { data, error } = await supabase
        .from('driver_load_summary')
        .select('*')
        .order('pickup_date', { ascending: true })

      if (error) throw error

      const formattedLoads: DriverLoad[] = (data || []).map((load: any) => ({
        id: load.id,
        load_number: load.load_number,
        status: load.status,
        origin: load.origin,
        destination: load.destination,
        pickup_date: load.pickup_date,
        delivery_date: load.delivery_date,
        notes: load.notes,
        vehicle_registration: load.vehicle_registration,
        trailer_registration: load.trailer_registration,
        vehicle_location: load.vehicle_location,
        client_company: load.client_company,
        created_at: load.created_at,
        updated_at: load.updated_at,
      }))

      setLoads(formattedLoads)

      // Calculate stats
      const active = formattedLoads.filter((l) =>
        ["assigned", "in_transit"].includes(l.status)
      )

      const today = new Date().toISOString().split("T")[0]
      const completedToday = formattedLoads.filter(
        (l) => l.status === "delivered" && l.delivery_date === today
      )

      const pending = formattedLoads.filter((l) => l.status === "pending")

      setStats({
        activeLoads: active.length,
        completedToday: completedToday.length,
        pendingPickup: pending.length,
      })
    } catch (error) {
      console.error('Error fetching loads:', error)
      toast.error('Failed to load your deliveries')
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const openStatusDialog = (load: DriverLoad) => {
    setSelectedLoad(load)
    setNewStatus(load.status)
    setStatusNotes("")
    setIsStatusDialogOpen(true)
  }

  const handleStatusUpdate = async () => {
    if (!selectedLoad) return

    setUpdating(true)
    try {
      const { error } = await supabase
        .from('ceva_loads')
        .update({
          status: newStatus,
          notes: statusNotes ? `${selectedLoad.notes || ''}\n[${new Date().toLocaleString()}] ${statusNotes}`.trim() : selectedLoad.notes,
        })
        .eq('id', selectedLoad.id)

      if (error) throw error

      toast.success('Load status updated successfully')
      setIsStatusDialogOpen(false)
      fetchLoads() // Refresh data
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error(error.message || 'Failed to update status')
    } finally {
      setUpdating(false)
    }
  }

  const activeLoads = loads.filter((l) => ["assigned", "in_transit"].includes(l.status))
  const completedLoads = loads.filter((l) => l.status === "delivered")
  const pendingLoads = loads.filter((l) => l.status === "pending")

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <Image
            src="/Ceva-Logo.png"
            alt="Ceva Logistics"
            width={200}
            height={60}
            className="h-14 w-auto"
          />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{driverDetails?.full_name || profile.full_name}</p>
              <p className="text-xs text-muted-foreground">Driver</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome, {driverDetails?.full_name || profile.full_name}
            </h1>
            <p className="text-muted-foreground">
              Manage your deliveries and update load status
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Loads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.activeLoads}</div>
                <p className="text-xs text-muted-foreground mt-1">Assigned or in transit</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{stats.completedToday}</div>
                <p className="text-xs text-muted-foreground mt-1">Deliveries made</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Pickup</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.pendingPickup}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting collection</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">Active Loads ({activeLoads.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingLoads.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedLoads.length})</TabsTrigger>
              <TabsTrigger value="profile">My Profile</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Active Deliveries</CardTitle>
                  <CardDescription>Loads currently assigned or in transit</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading loads...</p>
                    </div>
                  ) : activeLoads.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No active loads</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Check back later for new assignments
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeLoads.map((load) => (
                        <DriverLoadCard
                          key={load.id}
                          load={load}
                          onUpdateStatus={() => openStatusDialog(load)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Pending Pickups</CardTitle>
                  <CardDescription>Loads awaiting collection</CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingLoads.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No pending loads</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingLoads.map((load) => (
                        <DriverLoadCard
                          key={load.id}
                          load={load}
                          onUpdateStatus={() => openStatusDialog(load)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Completed Deliveries</CardTitle>
                  <CardDescription>Your delivery history</CardDescription>
                </CardHeader>
                <CardContent>
                  {completedLoads.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No completed loads yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {completedLoads.slice(0, 10).map((load) => (
                        <DriverLoadCard
                          key={load.id}
                          load={load}
                          onUpdateStatus={() => openStatusDialog(load)}
                          readonly
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Driver Information</CardTitle>
                  <CardDescription>Your profile details</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Full Name</span>
                      <span className="text-sm font-medium text-foreground">
                        {driverDetails?.full_name || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Email</span>
                      <span className="text-sm font-medium text-foreground">{profile.email}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">Phone</span>
                      <span className="text-sm font-medium text-foreground">
                        {driverDetails?.phone || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-border">
                      <span className="text-sm text-muted-foreground">License Number</span>
                      <span className="text-sm font-medium text-foreground">
                        {driverDetails?.license_number || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={driverDetails?.status === 'active' ? 'default' : 'secondary'}>
                        {driverDetails?.status || 'N/A'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Status Update Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Load Status</DialogTitle>
            <DialogDescription>
              Update the status for {selectedLoad?.load_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Badge className="w-fit">
                <LoadStatusBadge status={selectedLoad?.status || 'pending'} />
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStatus">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="statusNotes">Notes (Optional)</Label>
              <Textarea
                id="statusNotes"
                placeholder="Add any relevant notes about this status update..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatusDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={updating}>
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DriverLoadCard({
  load,
  onUpdateStatus,
  readonly = false,
}: {
  load: DriverLoad
  onUpdateStatus: () => void
  readonly?: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-accent/5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{load.load_number}</p>
                {load.client_company && (
                  <p className="text-sm text-muted-foreground">{load.client_company}</p>
                )}
              </div>
            </div>
            <LoadStatusBadge status={load.status} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium text-foreground">{load.origin}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">To</p>
                <p className="text-sm font-medium text-foreground">{load.destination}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Pickup: {new Date(load.pickup_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Delivery: {new Date(load.delivery_date).toLocaleDateString()}</span>
            </div>
            {load.vehicle_registration && (
              <div className="flex items-center gap-1">
                <Truck className="h-4 w-4" />
                <span>{load.vehicle_registration}</span>
              </div>
            )}
          </div>

          {load.notes && (
            <div className="flex items-start gap-2 rounded-md bg-muted p-2">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-sm text-foreground whitespace-pre-wrap">{load.notes}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 ml-4">
          {!readonly && (
            <Button variant="outline" size="sm" onClick={onUpdateStatus}>
              Update Status
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(load.origin)}&destination=${encodeURIComponent(load.destination)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Navigation className="h-4 w-4 mr-1" />
              Navigate
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}

function LoadStatusBadge({ status }: { status: DriverLoad["status"] }) {
  const statusConfig = {
    pending: { label: "Pending", className: "bg-yellow-500 text-yellow-50", icon: Clock },
    assigned: { label: "Assigned", className: "bg-blue-500 text-blue-50", icon: Package },
    in_transit: { label: "In Transit", className: "bg-accent text-accent-foreground", icon: Truck },
    delivered: { label: "Delivered", className: "bg-green-500 text-green-50", icon: CheckCircle },
    cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground", icon: AlertCircle },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <>
      <Icon className="h-3 w-3 mr-1 inline" />
      {config.label}
    </>
  )
}
