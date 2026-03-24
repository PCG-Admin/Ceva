import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Truck, Package, CreditCard, CheckCircle, MapPin } from "lucide-react"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const [
    { count: totalHorses },
    { count: activeLoads },
    { count: pendingLoads },
    { count: deliveredToday },
    { count: inTransitLoads },
    { count: horsesInUse },
    { count: horsesAvailable },
    { count: horsesMaintenance },
  ] = await Promise.all([
    supabase.from("ceva_horses").select("*", { count: "exact", head: true }),
    supabase.from("ceva_loads").select("*", { count: "exact", head: true }).in("status", ["pending", "assigned", "in-transit"]),
    supabase.from("ceva_loads").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("ceva_loads").select("*", { count: "exact", head: true }).eq("status", "delivered").gte("updated_at", todayISO),
    supabase.from("ceva_loads").select("*", { count: "exact", head: true }).eq("status", "in-transit"),
    supabase.from("ceva_horses").select("*", { count: "exact", head: true }).eq("status", "in_use"),
    supabase.from("ceva_horses").select("*", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("ceva_horses").select("*", { count: "exact", head: true }).eq("status", "maintenance"),
  ])

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{totalHorses ?? 0}</div>
            <p className="text-xs text-muted-foreground">Registered trucks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Loads</CardTitle>
            <Package className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{activeLoads ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-accent">{inTransitLoads ?? 0} in transit</span>, {pendingLoads ?? 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Loads</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{pendingLoads ?? 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting assignment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deliveries Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{deliveredToday ?? 0}</div>
            <p className="text-xs text-muted-foreground">Completed today</p>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-foreground">Fleet Status Overview</CardTitle>
          <CardDescription>Real-time vehicle status across all locations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                <Truck className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Use</p>
                <p className="text-2xl font-bold text-foreground">{horsesInUse ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                <MapPin className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Maintenance</p>
                <p className="text-2xl font-bold text-foreground">{horsesMaintenance ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-foreground">{horsesAvailable ?? 0}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
