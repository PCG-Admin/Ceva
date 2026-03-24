"use client"

import type React from "react"

import { useState } from "react"
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
} from "lucide-react"

interface ClientLoad {
  id: string
  loadNumber: string
  status: "in-transit" | "delivered" | "pending" | "cancelled"
  origin: string
  destination: string
  pickupDate: string
  deliveryDate: string
  currentLocation?: string
  vehicleNumber: string
  driverName: string
  driverPhone: string
  estimatedArrival?: string
}

const mockClientLoads: ClientLoad[] = [
  {
    id: "1",
    loadNumber: "L-2847",
    status: "in-transit",
    origin: "Johannesburg Warehouse",
    destination: "Cape Town Distribution Center",
    pickupDate: "2024-12-20",
    deliveryDate: "2024-12-22",
    currentLocation: "N1 Highway, Beaufort West",
    vehicleNumber: "GP-01-AB-1234",
    driverName: "Sipho Ndlovu",
    driverPhone: "+27 82 555 1234",
    estimatedArrival: "3h 24m",
  },
  {
    id: "2",
    loadNumber: "L-2845",
    status: "delivered",
    origin: "Johannesburg Warehouse",
    destination: "Cape Town Distribution Center",
    pickupDate: "2024-12-18",
    deliveryDate: "2024-12-20",
    vehicleNumber: "GP-01-AB-1234",
    driverName: "Sipho Ndlovu",
    driverPhone: "+27 82 555 1234",
  },
  {
    id: "3",
    loadNumber: "L-2849",
    status: "pending",
    origin: "Durban Hub",
    destination: "Pretoria Facility",
    pickupDate: "2024-12-22",
    deliveryDate: "2024-12-23",
    vehicleNumber: "KZN-03-EF-9012",
    driverName: "Andile Khumalo",
    driverPhone: "+27 83 555 4567",
  },
]

export function ClientPortal() {
  const [loads] = useState<ClientLoad[]>(mockClientLoads)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedLoad, setSelectedLoad] = useState<ClientLoad | null>(null)
  const [isTrackingDialogOpen, setIsTrackingDialogOpen] = useState(false)

  const filteredLoads = loads.filter(
    (load) =>
      load.loadNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      load.destination.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleTrackLoad = (load: ClientLoad) => {
    setSelectedLoad(load)
    setIsTrackingDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">12</div>
            <p className="text-xs text-muted-foreground mt-1">In transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered (Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">47</div>
            <p className="text-xs text-muted-foreground mt-1">100% on-time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Pickup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">3</div>
            <p className="text-xs text-muted-foreground mt-1">Scheduled today</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">R280K</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="shipments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="shipments">My Shipments</TabsTrigger>
          <TabsTrigger value="track">Track Load</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
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
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Booking
                </Button>
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
              <div className="space-y-3">
                {filteredLoads.map((load) => (
                  <ClientLoadCard key={load.id} load={load} onTrack={() => handleTrackLoad(load)} />
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="track" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Track Your Shipment</CardTitle>
              <CardDescription>Enter load number to get real-time updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Enter load number (e.g., L-2847)" className="flex-1" />
                <Button>Track</Button>
              </div>

              {/* Recent Tracking */}
              <div className="pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Recent Shipments</p>
                <div className="space-y-2">
                  {loads
                    .filter((l) => l.status === "in-transit")
                    .map((load) => (
                      <button
                        key={load.id}
                        onClick={() => handleTrackLoad(load)}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-primary" />
                          <div className="text-left">
                            <p className="text-sm font-medium text-foreground">{load.loadNumber}</p>
                            <p className="text-xs text-muted-foreground">{load.destination}</p>
                          </div>
                        </div>
                        <LoadStatusBadge status={load.status} />
                      </button>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tracking Timeline Example */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Shipment Timeline</CardTitle>
              <CardDescription>Detailed tracking history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <TimelineItem
                  status="completed"
                  title="Shipment Delivered"
                  description="Package delivered to destination"
                  time="Dec 20, 2024 - 14:30"
                />
                <TimelineItem
                  status="completed"
                  title="Out for Delivery"
                  description="Vehicle reached destination city"
                  time="Dec 20, 2024 - 08:15"
                />
                <TimelineItem
                  status="completed"
                  title="In Transit"
                  description="Shipment en route via N1 Highway"
                  time="Dec 19, 2024 - 16:45"
                />
                <TimelineItem
                  status="completed"
                  title="Pickup Complete"
                  description="Shipment picked up from origin"
                  time="Dec 18, 2024 - 11:20"
                />
                <TimelineItem
                  status="completed"
                  title="Booking Confirmed"
                  description="Load booking confirmed with Ceva"
                  time="Dec 18, 2024 - 09:00"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Shipment Documents</CardTitle>
              <CardDescription>Access invoices, PODs, and transport documents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <DocumentItem type="Invoice" loadNumber="L-2847" date="Dec 20, 2024" amount="R85,000" />
                <DocumentItem type="ePOD" loadNumber="L-2845" date="Dec 20, 2024" status="Verified" />
                <DocumentItem type="LR Copy" loadNumber="L-2847" date="Dec 18, 2024" />
                <DocumentItem type="Invoice" loadNumber="L-2840" date="Dec 15, 2024" amount="R72,000" />
                <DocumentItem type="ePOD" loadNumber="L-2835" date="Dec 12, 2024" status="Verified" />
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
                <CardTitle className="text-foreground">Quick Actions</CardTitle>
                <CardDescription>Common tasks and requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <Package className="mr-2 h-4 w-4" />
                  Request New Quote
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Download All Documents
                </Button>
                <Button className="w-full justify-start bg-transparent" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Shipping History
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-foreground">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FAQItem
                  question="How do I track my shipment?"
                  answer="Use the Track Load tab and enter your load number. You'll get real-time updates on location and estimated delivery time."
                />
                <FAQItem
                  question="When will I receive my invoice?"
                  answer="Invoices are generated automatically after delivery and available in the Documents tab within 24 hours."
                />
                <FAQItem
                  question="How can I contact my driver?"
                  answer="Driver contact details are available in your shipment details. Click on any active shipment to view driver information."
                />
                <FAQItem
                  question="What if my delivery is delayed?"
                  answer="You'll receive automatic notifications for any delays. Our support team is available 24/7 via WhatsApp for urgent issues."
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Tracking Dialog */}
      <Dialog open={isTrackingDialogOpen} onOpenChange={setIsTrackingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Live Tracking - {selectedLoad?.loadNumber}</DialogTitle>
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
                <p className="font-semibold text-foreground">{load.loadNumber}</p>
                <p className="text-sm text-muted-foreground">{load.vehicleNumber}</p>
              </div>
            </div>
            <LoadStatusBadge status={load.status} />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-accent mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">From</p>
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
                <p className="text-xs text-muted-foreground">To</p>
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

          {load.currentLocation && (
            <div className="flex items-center gap-2 rounded-md bg-accent/10 p-2">
              <MapPin className="h-4 w-4 text-accent" />
              <p className="text-sm text-foreground">{load.currentLocation}</p>
            </div>
          )}

          {load.estimatedArrival && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>ETA: {load.estimatedArrival}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 ml-4">
          <Button variant="outline" size="icon" onClick={onTrack}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function LoadStatusBadge({ status }: { status: ClientLoad["status"] }) {
  const statusConfig = {
    pending: { label: "Pending Pickup", className: "bg-destructive text-destructive-foreground", icon: Clock },
    "in-transit": { label: "In Transit", className: "bg-accent text-accent-foreground", icon: Package },
    delivered: { label: "Delivered", className: "bg-primary text-primary-foreground", icon: CheckCircle },
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
          <img
            src="/placeholder.svg?height=300&width=800"
            alt="Live tracking map"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute top-4 left-4 bg-card p-3 rounded-lg shadow-lg border border-border">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-foreground">Live Location</span>
          </div>
        </div>
      </div>

      {/* Shipment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Shipment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label="Load Number" value={load.loadNumber} />
            <DetailRow label="Status" value={<LoadStatusBadge status={load.status} />} />
            <DetailRow label="Vehicle Number" value={load.vehicleNumber} />
            <DetailRow label="Driver Name" value={load.driverName} />
            <DetailRow label="Driver Contact" value={load.driverPhone} />
            {load.estimatedArrival && <DetailRow label="Estimated Arrival" value={load.estimatedArrival} />}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button className="flex-1">
          <MessageSquare className="h-4 w-4 mr-2" />
          Contact Driver
        </Button>
        <Button className="flex-1 bg-transparent" variant="outline">
          <Share2 className="h-4 w-4 mr-2" />
          Share Tracking
        </Button>
      </div>
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

function TimelineItem({
  status,
  title,
  description,
  time,
}: {
  status: "completed" | "pending"
  title: string
  description: string
  time: string
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${
            status === "completed" ? "bg-accent" : "bg-muted"
          }`}
        >
          {status === "completed" ? (
            <CheckCircle className="h-4 w-4 text-accent-foreground" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="w-0.5 h-full bg-border mt-2" />
      </div>
      <div className="flex-1 pb-8">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">{time}</p>
      </div>
    </div>
  )
}

function DocumentItem({
  type,
  loadNumber,
  date,
  amount,
  status,
}: {
  type: string
  loadNumber: string
  date: string
  amount?: string
  status?: string
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <FileText className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {type} - {loadNumber}
          </p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {amount && <span className="text-sm font-medium text-foreground">{amount}</span>}
        {status && <Badge variant="outline">{status}</Badge>}
        <Button variant="outline" size="icon">
          <Download className="h-4 w-4" />
        </Button>
      </div>
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
