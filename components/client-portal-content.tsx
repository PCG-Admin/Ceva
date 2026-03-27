"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Package,
  MapPin,
  Clock,
  FileText,
  Download,
  Eye,
  MessageSquare,
  Bell,
  Share2,
  Search,
  Plus,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  LogOut,
  User,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface ClientLoad {
  id: string
  load_number: string
  status: "pending" | "assigned" | "in_transit" | "delivered" | "cancelled"
  origin: string
  destination: string
  pickup_date: string
  delivery_date: string
  current_location?: string
  vehicle_number?: string
  driver_name?: string
  driver_phone?: string
  rate?: number
  created_at: string
}

interface ClientPortalContentProps {
  user: any
  profile: any
  clientDetails: any
}

export function ClientPortalContent({ user, profile, clientDetails }: ClientPortalContentProps) {
  const supabase = createClient()
  const router = useRouter()

  const [loads, setLoads] = useState<ClientLoad[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLoad, setSelectedLoad] = useState<ClientLoad | null>(null)
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Stats
  const [stats, setStats] = useState({
    activeShipments: 0,
    deliveredMonth: 0,
    pendingPickup: 0,
    totalSpent: 0,
  })

  useEffect(() => {
    fetchLoads()
  }, [])

  const fetchLoads = async () => {
    setLoading(true)
    try {
      // Fetch ALL loads directly from ceva_loads table (temporary fix)
      const { data, error } = await supabase
        .from('ceva_loads')
        .select(`
          id,
          load_number,
          status,
          origin,
          destination,
          pickup_date,
          delivery_date,
          rate,
          created_at,
          horse:ceva_horses(registration_number),
          driver:ceva_drivers(first_name, last_name, contact_phone)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedLoads: ClientLoad[] = (data || []).map((load: any) => ({
        id: load.id,
        load_number: load.load_number,
        status: load.status,
        origin: load.origin,
        destination: load.destination,
        pickup_date: load.pickup_date,
        delivery_date: load.delivery_date,
        current_location: undefined,
        vehicle_number: load.horse?.registration_number || undefined,
        driver_name: load.driver ? `${load.driver.first_name} ${load.driver.last_name}` : undefined,
        driver_phone: load.driver?.contact_phone || undefined,
        rate: load.rate,
        created_at: load.created_at,
      }))

      setLoads(formattedLoads)

      // Calculate stats
      const active = formattedLoads.filter((l) =>
        ["pending", "assigned", "in_transit"].includes(l.status)
      )

      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const deliveredThisMonth = formattedLoads.filter(
        (l) => l.status === "delivered" && new Date(l.delivery_date) >= firstDayOfMonth
      )

      const pending = formattedLoads.filter((l) => l.status === "pending")

      const totalSpent = deliveredThisMonth.reduce((sum, l) => sum + (l.rate || 0), 0)

      setStats({
        activeShipments: active.length,
        deliveredMonth: deliveredThisMonth.length,
        pendingPickup: pending.length,
        totalSpent,
      })
    } catch (error) {
      console.error('Error fetching loads:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const filteredLoads = loads.filter(
    (load) =>
      load.load_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.destination.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTrackLoad = (load: ClientLoad) => {
    setSelectedLoad(load)
    setIsTrackingDialogOpen(true)
  }

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
              <p className="text-sm font-medium text-foreground">{clientDetails?.company_name || profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
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
              Welcome, {clientDetails?.company_name || profile.full_name}
            </h1>
            <p className="text-muted-foreground">
              Track your shipments and manage bookings in real-time
            </p>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Shipments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.activeShipments}</div>
                <p className="text-xs text-muted-foreground mt-1">In transit</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Delivered (Month)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">{stats.deliveredMonth}</div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  R{(stats.totalSpent / 1000).toFixed(0)}K
                </div>
                <p className="text-xs text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="shipments" className="space-y-6">
            <TabsList>
              <TabsTrigger value="shipments">My Shipments</TabsTrigger>
              <TabsTrigger value="track">Track Load</TabsTrigger>
              <TabsTrigger value="support">Support</TabsTrigger>
            </TabsList>

            <TabsContent value="shipments" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-foreground">Shipment Management</CardTitle>
                      <CardDescription>Track all your shipments in real-time</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search shipments..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading shipments...</p>
                    </div>
                  ) : filteredLoads.length === 0 ? (
                    <div className="text-center py-8">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No shipments found</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {searchTerm ? 'Try adjusting your search' : 'Contact us to create your first booking'}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredLoads.map((load) => (
                        <ClientLoadCard key={load.id} load={load} onTrack={() => handleTrackLoad(load)} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="track" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-foreground">Track Your Shipment</CardTitle>
                  <CardDescription>Click on any active shipment to see live tracking</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Active Shipments */}
                  <div className="pt-4">
                    <p className="text-sm font-medium text-foreground mb-3">Active Shipments</p>
                    <div className="space-y-2">
                      {loads
                        .filter((l) => ["in_transit", "assigned"].includes(l.status))
                        .map((load) => (
                          <button
                            key={load.id}
                            onClick={() => handleTrackLoad(load)}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Package className="h-5 w-5 text-primary" />
                              <div className="text-left">
                                <p className="text-sm font-medium text-foreground">{load.load_number}</p>
                                <p className="text-xs text-muted-foreground">{load.destination}</p>
                              </div>
                            </div>
                            <LoadStatusBadge status={load.status} />
                          </button>
                        ))}
                      {loads.filter((l) => ["in_transit", "assigned"].includes(l.status)).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No active shipments</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="support" className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground">Contact Support</CardTitle>
                    <CardDescription>Get help with your shipments</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button className="w-full justify-start bg-transparent" variant="outline">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Start WhatsApp Chat
                    </Button>
                    <Button className="w-full justify-start bg-transparent" variant="outline">
                      <Bell className="mr-2 h-4 w-4" />
                      View Notifications
                    </Button>
                    <Button className="w-full justify-start bg-transparent" variant="outline">
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Tracking Link
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-foreground">Account Information</CardTitle>
                    <CardDescription>Your client details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Company</span>
                        <span className="text-sm font-medium text-foreground">
                          {clientDetails?.company_name || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Contact</span>
                        <span className="text-sm font-medium text-foreground">
                          {clientDetails?.contact_person || profile.full_name}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-border">
                        <span className="text-sm text-muted-foreground">Email</span>
                        <span className="text-sm font-medium text-foreground">{profile.email}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-muted-foreground">Phone</span>
                        <span className="text-sm font-medium text-foreground">
                          {clientDetails?.phone || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="md:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-foreground">Frequently Asked Questions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FAQItem
                      question="How do I track my shipment?"
                      answer="Use the Track Load tab and click on any active shipment. You'll get real-time updates on location and estimated delivery time."
                    />
                    <FAQItem
                      question="When will I receive my invoice?"
                      answer="Invoices are generated automatically after delivery and sent to your registered email within 24 hours."
                    />
                    <FAQItem
                      question="How can I contact my driver?"
                      answer="Driver contact details are available in your shipment details. Click on any active shipment to view driver information."
                    />
                    <FAQItem
                      question="What if my delivery is delayed?"
                      answer="You'll receive automatic notifications for any delays. Our support team is available 24/7 for urgent issues."
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Tracking Dialog */}
      <Dialog open={isTrackingDialogOpen} onOpenChange={setIsTrackingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Live Tracking - {selectedLoad?.load_number}</DialogTitle>
            <DialogDescription>Real-time shipment location and status</DialogDescription>
          </DialogHeader>
          {selectedLoad && <LoadTrackingDetails load={selectedLoad} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ClientLoadCard({ load, onTrack }: { load: ClientLoad; onTrack: () => void }) {
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
                <p className="text-sm text-muted-foreground">{load.vehicle_number || 'Not assigned'}</p>
              </div>
            </div>
            <LoadStatusBadge status={load.status} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-accent mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-medium text-foreground">{load.origin}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">To</p>
                <p className="text-sm font-medium text-foreground">{load.destination}</p>
              </div>
            </div>
          </div>

          {load.current_location && (
            <div className="flex items-center gap-2 rounded-md bg-accent/10 p-2">
              <MapPin className="h-4 w-4 text-accent" />
              <p className="text-sm text-foreground">{load.current_location}</p>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Pickup: {new Date(load.pickup_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Delivery: {new Date(load.delivery_date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <Button variant="outline" size="icon" onClick={onTrack}>
            <Eye className="h-4 w-4" />
          </Button>
          {load.driver_phone && (
            <Button variant="outline" size="icon" asChild>
              <a href={`https://wa.me/${load.driver_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadStatusBadge({ status }: { status: ClientLoad["status"] }) {
  const statusConfig = {
    pending: { label: "Pending", className: "bg-yellow-500 text-yellow-50", icon: Clock },
    assigned: { label: "Assigned", className: "bg-blue-500 text-blue-50", icon: Package },
    in_transit: { label: "In Transit", className: "bg-accent text-accent-foreground", icon: Package },
    delivered: { label: "Delivered", className: "bg-green-500 text-green-50", icon: CheckCircle },
    cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground", icon: AlertCircle },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge className={config.className}>
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

function LoadTrackingDetails({ load }: { load: ClientLoad }) {
  return (
    <div className="space-y-6">
      {/* Map Placeholder */}
      <div className="relative h-[300px] rounded-lg border border-border bg-muted overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <MapPin className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Live tracking map coming soon</p>
            {load.current_location && (
              <p className="text-sm text-foreground mt-2">Current: {load.current_location}</p>
            )}
          </div>
        </div>
        {load.status === "in_transit" && (
          <div className="absolute top-4 left-4 bg-card p-3 rounded-lg shadow-lg border border-border">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-accent animate-pulse" />
              <span className="text-sm font-medium text-foreground">Live Location</span>
            </div>
          </div>
        )}
      </div>

      {/* Shipment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Shipment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label="Load Number" value={load.load_number} />
            <DetailRow label="Status" value={<LoadStatusBadge status={load.status} />} />
            <DetailRow label="Vehicle Number" value={load.vehicle_number || 'Not assigned'} />
            <DetailRow label="Driver Name" value={load.driver_name || 'Not assigned'} />
            {load.driver_phone && (
              <DetailRow label="Driver Contact" value={load.driver_phone} />
            )}
            <DetailRow label="Pickup Date" value={new Date(load.pickup_date).toLocaleDateString()} />
            <DetailRow label="Delivery Date" value={new Date(load.delivery_date).toLocaleDateString()} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {load.driver_phone && (
        <div className="flex gap-2">
          <Button className="flex-1" asChild>
            <a href={`https://wa.me/${load.driver_phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Driver
            </a>
          </Button>
          <Button className="flex-1 bg-transparent" variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share Tracking
          </Button>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  return (
    <div className="pb-4 border-b border-border last:border-0">
      <p className="text-sm font-medium text-foreground mb-2">{question}</p>
      <p className="text-sm text-muted-foreground">{answer}</p>
    </div>
  )
}
