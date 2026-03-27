"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Package, MapPin, DollarSign, Weight, Calendar, Truck, AlertTriangle, User } from "lucide-react"
import { format, parseISO } from "date-fns"
import { getMaterialColor, MATERIAL_LABELS } from "./material-colors"
import type { PlanningLoad } from "@/types/planning"

interface LoadDetailDialogProps {
  load: PlanningLoad | null
  open: boolean
  onOpenChange: (open: boolean) => void
  drivers: { id: string; first_name: string; last_name: string; transporter_id: string; status: string }[]
  trailers: { id: string; registration_number: string; trailer_type: string; transporter_id: string }[]
  onQuickAssign: (loadId: string, field: string, value: string | null) => void
}

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pending", variant: "secondary" },
  assigned: { label: "Assigned", variant: "default" },
  "in-transit": { label: "In Transit", variant: "outline" },
  delivered: { label: "Delivered", variant: "default" },
  cancelled: { label: "Cancelled", variant: "destructive" },
}

export function LoadDetailDialog({ load, open, onOpenChange, drivers, trailers, onQuickAssign }: LoadDetailDialogProps) {
  if (!load) return null

  const colors = getMaterialColor(load.material)
  const materialLabel = MATERIAL_LABELS[load.material] || load.material
  const statusConfig = STATUS_CONFIG[load.status] || STATUS_CONFIG.pending

  // Filter drivers and trailers by the load's supplier (transporter)
  const filteredDrivers = load.supplier_id
    ? drivers.filter((d) => d.transporter_id === load.supplier_id)
    : drivers
  const filteredTrailers = load.supplier_id
    ? trailers.filter((t) => t.transporter_id === load.supplier_id)
    : trailers

  // Exclude the other trailer from each list to prevent duplicates
  const trailer1Options = filteredTrailers.filter((t) => t.id !== load.trailer2_id)
  const trailer2Options = filteredTrailers.filter((t) => t.id !== load.trailer_id)

  const hasMissing = load.horse_id && (!load.driver_id || !load.trailer_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {load.load_number}
            <Badge variant={statusConfig.variant} className="ml-auto">
              {statusConfig.label}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Material & Client */}
          <div className="flex items-center gap-2">
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
              {materialLabel}
            </span>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm">{load.client}</span>
          </div>

          {/* Route */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Origin</div>
                <div className="text-sm">{load.origin}</div>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-muted-foreground">Destination</div>
                <div className="text-sm">{load.destination}</div>
              </div>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Rate</div>
                <div className="text-sm font-medium">R{load.rate.toLocaleString()}</div>
              </div>
            </div>
            {load.weight && (
              <div className="flex items-center gap-2">
                <Weight className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Weight</div>
                  <div className="text-sm font-medium">{load.weight} t</div>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Pickup</div>
                <div className="text-sm">{format(parseISO(load.pickup_date), 'dd MMM yyyy')}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Delivery</div>
                <div className="text-sm">{format(parseISO(load.delivery_date), 'dd MMM yyyy')}</div>
              </div>
            </div>
          </div>

          {/* Assignment info */}
          {load.supplier && load.supplier.length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Assigned to</div>
                <div className="text-sm">
                  {(load.horse && load.horse.length > 0) ? load.horse[0].registration_number : 'N/A'} — {load.supplier[0].trading_name || load.supplier[0].company_name}
                </div>
              </div>
            </div>
          )}

          {/* Quick Assignment Section */}
          {load.horse_id && (
            <div className="space-y-3 pt-2 border-t border-border">
              <div className="flex items-center gap-2">
                {hasMissing && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Quick Assignment
                </span>
              </div>

              {/* Driver */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Driver
                  {!load.driver_id && <span className="text-amber-500">• Not assigned</span>}
                </label>
                <Select
                  value={load.driver_id || "none"}
                  onValueChange={(value) =>
                    onQuickAssign(load.id, "driver_id", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select driver" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No driver</SelectItem>
                    {filteredDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.first_name} {d.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trailer 1 */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  Trailer 1
                  {!load.trailer_id && <span className="text-amber-500">• Not assigned</span>}
                </label>
                <Select
                  value={load.trailer_id || "none"}
                  onValueChange={(value) =>
                    onQuickAssign(load.id, "trailer_id", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select trailer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No trailer</SelectItem>
                    {trailer1Options.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.registration_number} ({t.trailer_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trailer 2 */}
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  Trailer 2 <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <Select
                  value={load.trailer2_id || "none"}
                  onValueChange={(value) =>
                    onQuickAssign(load.id, "trailer2_id", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Select trailer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No trailer</SelectItem>
                    {trailer2Options.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.registration_number} ({t.trailer_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {load.notes && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">Notes</div>
              <div className="text-sm">{load.notes}</div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            Order: {load.order_number}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
