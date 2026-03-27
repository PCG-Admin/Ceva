"use client"

import type React from "react"

import { useState } from "react"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  ImageIcon,
  Download,
  Eye,
  Search,
  Camera,
  MapPin,
  User,
  Calendar,
  FileSignature,
} from "lucide-react"

interface POD {
  id: string
  loadNumber: string
  client: string
  destination: string
  deliveryDate: string
  deliveryTime: string
  receiverName: string
  receiverSignature: string
  status: "pending" | "completed" | "rejected"
  photos: string[]
  notes: string
  vehicleNumber: string
  driverName: string
}

const mockPODs: POD[] = [
  {
    id: "1",
    loadNumber: "L-2847",
    client: "ABC Logistics",
    destination: "Cape Town Distribution Center",
    deliveryDate: "2024-12-20",
    deliveryTime: "14:30",
    receiverName: "Thabo Mbeki",
    receiverSignature: "signature_url",
    status: "completed",
    photos: ["photo1.jpg", "photo2.jpg"],
    notes: "Goods received in good condition",
    vehicleNumber: "GP-01-AB-1234",
    driverName: "Sipho Ndlovu",
  },
  {
    id: "2",
    loadNumber: "L-2848",
    client: "XYZ Traders",
    destination: "Durban Hub",
    deliveryDate: "2024-12-21",
    deliveryTime: "16:45",
    receiverName: "Johan van der Merwe",
    receiverSignature: "signature_url",
    status: "completed",
    photos: ["photo1.jpg"],
    notes: "Minor packaging damage on 2 boxes, documented",
    vehicleNumber: "WC-02-CD-5678",
    driverName: "Mandla Dlamini",
  },
  {
    id: "3",
    loadNumber: "L-2849",
    client: "PQR Industries",
    destination: "Pretoria Facility",
    deliveryDate: "2024-12-22",
    deliveryTime: "",
    receiverName: "",
    receiverSignature: "",
    status: "pending",
    photos: [],
    notes: "",
    vehicleNumber: "KZN-03-EF-9012",
    driverName: "Andile Khumalo",
  },
]

export function EPODSystem() {
  const [pods, setPods] = useState<POD[]>(mockPODs)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedPOD, setSelectedPOD] = useState<POD | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)

  const filteredPODs = pods.filter((pod) => {
    const matchesSearch =
      pod.loadNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pod.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pod.destination.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || pod.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleViewPOD = (pod: POD) => {
    setSelectedPOD(pod)
    setIsViewDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total ePODs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">842</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">789</div>
            <p className="text-xs text-muted-foreground mt-1">94% completion rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">45</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting signature</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">2.3h</div>
            <p className="text-xs text-muted-foreground mt-1">Below target of 4h</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Electronic Proof of Delivery</CardTitle>
              <CardDescription>Manage delivery confirmations and documentation</CardDescription>
            </div>
            <Button>
              <FileSignature className="h-4 w-4 mr-2" />
              Create ePOD
            </Button>
          </div>
          <div className="flex gap-2 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by load number, client, or destination..."
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
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPODs.map((pod) => (
              <PODCard key={pod.id} pod={pod} onView={() => handleViewPOD(pod)} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* View POD Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Proof of Delivery - {selectedPOD?.loadNumber}</DialogTitle>
            <DialogDescription>Complete delivery documentation and signatures</DialogDescription>
          </DialogHeader>
          {selectedPOD && <PODDetails pod={selectedPOD} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PODCard({ pod, onView }: { pod: POD; onView: () => void }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 hover:bg-accent/5 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{pod.loadNumber}</p>
                <p className="text-sm text-muted-foreground">{pod.client}</p>
              </div>
            </div>
            <PODStatusBadge status={pod.status} />
          </div>

          {/* Delivery Info */}
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Destination</p>
                <p className="text-sm font-medium text-foreground">{pod.destination}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Delivery Date</p>
                <p className="text-sm font-medium text-foreground">
                  {new Date(pod.deliveryDate).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                  {pod.deliveryTime && ` at ${pod.deliveryTime}`}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          {pod.status === "completed" && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Receiver</p>
                  <p className="text-sm font-medium text-foreground">{pod.receiverName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Camera className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Photos</p>
                  <p className="text-sm font-medium text-foreground">{pod.photos.length} images</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Signature</p>
                  <p className="text-sm font-medium text-foreground">Verified</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 ml-4">
          <Button variant="outline" size="icon" onClick={onView}>
            <Eye className="h-4 w-4" />
          </Button>
          {pod.status === "completed" && (
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function PODStatusBadge({ status }: { status: POD["status"] }) {
  const statusConfig = {
    pending: { label: "Pending", className: "bg-destructive text-destructive-foreground", icon: Clock },
    completed: { label: "Completed", className: "bg-accent text-accent-foreground", icon: CheckCircle },
    rejected: { label: "Rejected", className: "bg-muted text-muted-foreground", icon: XCircle },
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

function PODDetails({ pod }: { pod: POD }) {
  return (
    <div className="space-y-6">
      {/* Load Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base text-foreground">Load Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <DetailRow label="Load Number" value={pod.loadNumber} />
            <DetailRow label="Client" value={pod.client} />
            <DetailRow label="Vehicle Number" value={pod.vehicleNumber} />
            <DetailRow label="Driver Name" value={pod.driverName} />
          </div>
          <div className="pt-3 border-t border-border">
            <DetailRow label="Destination" value={pod.destination} />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Details */}
      {pod.status === "completed" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Delivery Confirmation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow label="Delivery Date" value={new Date(pod.deliveryDate).toLocaleDateString("en-IN")} />
                <DetailRow label="Delivery Time" value={pod.deliveryTime} />
                <DetailRow label="Receiver Name" value={pod.receiverName} />
                <DetailRow label="Status" value={<PODStatusBadge status={pod.status} />} />
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Receiver Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border-2 border-dashed border-border bg-muted p-8 flex items-center justify-center">
                <div className="text-center">
                  <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Digital signature captured</p>
                  <p className="text-xs text-muted-foreground mt-1">By {pod.receiverName}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-foreground">Delivery Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {pod.photos.map((photo, index) => (
                  <div key={index} className="rounded-lg border border-border bg-muted overflow-hidden">
                    <Image
                      src="/placeholder.svg?height=200&width=300"
                      alt={`Delivery photo ${index + 1}`}
                      width={300}
                      height={200}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-2">
                      <p className="text-xs text-muted-foreground">Photo {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {pod.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base text-foreground">Delivery Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{pod.notes}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Pending Status */}
      {pod.status === "pending" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-foreground">Capture ePOD</CardTitle>
            <CardDescription>Complete delivery documentation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="receiverName">Receiver Name *</Label>
              <Input id="receiverName" placeholder="Enter receiver's full name" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="deliveryTime">Delivery Time *</Label>
                <Input id="deliveryTime" type="time" />
              </div>
              <div className="space-y-2">
                <Label>Delivery Photos *</Label>
                <Button variant="outline" className="w-full bg-transparent">
                  <Camera className="h-4 w-4 mr-2" />
                  Upload Photos
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Receiver Signature *</Label>
              <div className="rounded-lg border-2 border-dashed border-border bg-muted p-8 flex items-center justify-center">
                <div className="text-center">
                  <FileSignature className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tap to capture signature</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Delivery Notes</Label>
              <Textarea id="notes" placeholder="Any special observations or issues" rows={3} />
            </div>

            <Button className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete ePOD
            </Button>
          </CardContent>
        </Card>
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
