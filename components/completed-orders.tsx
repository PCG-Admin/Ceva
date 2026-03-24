"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  Weight,
  DollarSign,
  Search,
  CheckCircle,
  Loader2,
  ExternalLink,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface CompletedLoad {
  id: string
  load_number: string
  order_number: string
  loading_number: string | null
  offloading_number: string | null
  client: string
  client_contact: string | null
  origin: string
  destination: string
  pickup_date: string
  delivery_date: string
  weight: number | null
  material: string
  rate: number
  notes: string | null
  created_at: string
  supplier?: { company_name: string; trading_name: string | null } | null
  horse?: { registration_number: string; make: string | null; model: string | null } | null
  trailer?: { registration_number: string; trailer_type: string } | null
  trailer2?: { registration_number: string; trailer_type: string } | null
  driver?: { first_name: string; last_name: string } | null
  contract?: { contract_name: string } | null
}

interface Stats {
  totalDelivered: number
  totalRevenue: number
  monthCount: number
  monthRevenue: number
}

export function CompletedOrders() {
  const [loads, setLoads] = useState<CompletedLoad[]>([])
  const [stats, setStats] = useState<Stats>({ totalDelivered: 0, totalRevenue: 0, monthCount: 0, monthRevenue: 0 })
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  const fetchDeliveredLoads = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("ceva_loads")
      .select(`
        *,
        supplier:ceva_transporters!supplier_id(company_name, trading_name),
        horse:ceva_horses!horse_id(registration_number, make, model),
        trailer:ceva_trailers!trailer_id(registration_number, trailer_type),
        trailer2:ceva_trailers!trailer2_id(registration_number, trailer_type),
        driver:ceva_drivers!driver_id(first_name, last_name),
        contract:ceva_contracts!contract_id(contract_name)
      `)
      .eq("status", "delivered")
      .order("delivery_date", { ascending: false })

    if (error) {
      console.error("Error fetching delivered loads:", error)
    } else {
      const allLoads = data || []
      setLoads(allLoads)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const monthLoads = allLoads.filter((l) => l.created_at >= monthStart)

      setStats({
        totalDelivered: allLoads.length,
        totalRevenue: allLoads.reduce((sum, l) => sum + Number(l.rate), 0),
        monthCount: monthLoads.length,
        monthRevenue: monthLoads.reduce((sum, l) => sum + Number(l.rate), 0),
      })
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    fetchDeliveredLoads()
  }, [fetchDeliveredLoads])

  const filteredLoads = loads.filter((load) => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      load.order_number.toLowerCase().includes(term) ||
      load.client.toLowerCase().includes(term) ||
      load.origin.toLowerCase().includes(term) ||
      load.destination.toLowerCase().includes(term) ||
      (load.supplier?.company_name || "").toLowerCase().includes(term) ||
      (load.supplier?.trading_name || "").toLowerCase().includes(term)
    )
  })

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`
  }

  const formatCurrencyShort = (amount: number) => {
    if (amount >= 1_000_000) return `R${(amount / 1_000_000).toFixed(1)}M`
    if (amount >= 1_000) return `R${(amount / 1_000).toFixed(0)}K`
    return `R${amount.toLocaleString("en-ZA")}`
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.totalDelivered}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrencyShort(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">All delivered loads</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stats.monthCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Deliveries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Month Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrencyShort(stats.monthRevenue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Current month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-foreground">Completed Orders</CardTitle>
            <CardDescription>All delivered loads</CardDescription>
          </div>
          <div className="pt-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, client, location, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
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
              <p className="font-medium">No completed orders found</p>
              <p className="text-sm mt-1">{searchTerm ? "Try a different search term" : "No loads have been delivered yet"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLoads.map((load) => (
                <div key={load.id} className="rounded-lg border border-border bg-card p-4 hover:bg-accent/5 transition-colors">
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
                      <Badge className="bg-primary text-primary-foreground">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Delivered
                      </Badge>
                    </div>

                    {/* Route */}
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
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid gap-3 md:grid-cols-5">
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
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Delivered</p>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(load.delivery_date).toLocaleDateString("en-ZA", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Weight</p>
                          <p className="text-sm font-medium text-foreground">{load.weight ? `${load.weight} t` : "N/A"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Rate</p>
                          <p className="text-sm font-medium text-foreground">{formatCurrency(Number(load.rate))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">Supplier</p>
                          <p className="text-sm font-medium text-foreground">
                            {load.supplier ? (load.supplier.trading_name || load.supplier.company_name) : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Vehicle & Driver */}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
