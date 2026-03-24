"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Truck,
  Package,
  CheckCircle,
  MapPin,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { UserProfileMenu } from "@/components/user-profile-menu"

const portals = [
  {
    title: "Customer",
    description: "Create loads and track shipment status",
    icon: Users,
    href: "/customer",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    title: "Transporter",
    description: "Manage transporter profiles and trucks",
    icon: Truck,
    href: "/transporter",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
  },
  {
    title: "Finance / Admin",
    description: "Analytics, completed orders, and reporting",
    icon: Package,
    href: "/admin",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
  },
]

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Package className="h-4 w-4 text-yellow-500" />,
  assigned: <Truck className="h-4 w-4 text-blue-500" />,
  "in-transit": <MapPin className="h-4 w-4 text-orange-500" />,
  delivered: <CheckCircle className="h-4 w-4 text-accent" />,
  cancelled: <Package className="h-4 w-4 text-destructive" />,
}

function timeAgo(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? "s" : ""} ago`
}

export function PortalHome() {
  const supabase = createClient()

  const [activeVehicles, setActiveVehicles] = useState(0)
  const [totalVehicles, setTotalVehicles] = useState(0)
  const [activeLoads, setActiveLoads] = useState(0)
  const [deliveriesToday, setDeliveriesToday] = useState(0)
  const [deliveriesTodayCompleted, setDeliveriesTodayCompleted] = useState(0)
  const [recentLoads, setRecentLoads] = useState<any[]>([])
  const [fleetInUse, setFleetInUse] = useState(0)
  const [fleetAvailable, setFleetAvailable] = useState(0)

  useEffect(() => {
    async function fetchData() {
      // Fetch horses for vehicle stats
      const { data: horses } = await supabase
        .from("ceva_horses")
        .select("id, status")

      if (horses) {
        setTotalVehicles(horses.length)
      }

      // Fetch loads for active loads count
      const { data: loads } = await supabase
        .from("ceva_loads")
        .select("id, status, rate, delivery_date, load_number, origin, destination, client, created_at, horse_id")
        .order("created_at", { ascending: false })

      if (loads) {
        const active = loads.filter((l) =>
          ["pending", "assigned", "in-transit"].includes(l.status)
        )
        setActiveLoads(active.length)

        // Count vehicles actively assigned to loads (since horse status doesn't auto-update)
        const activeHorseIds = new Set(
          active.filter((l) => l.horse_id).map((l) => l.horse_id)
        )
        setActiveVehicles(activeHorseIds.size)
        if (horses) {
          setFleetInUse(activeHorseIds.size)
          setFleetAvailable(horses.length - activeHorseIds.size)
        }

        const today = new Date().toISOString().split("T")[0]
        const todayLoads = loads.filter((l) => l.delivery_date === today)
        setDeliveriesToday(todayLoads.length)
        setDeliveriesTodayCompleted(
          todayLoads.filter((l) => l.status === "delivered").length
        )

        setRecentLoads(loads.slice(0, 5))
      }
    }

    fetchData()
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex h-20 items-center justify-between px-6">
          <Image
            src="/Ceva_Logo.png"
            alt="Ceva Logistics"
            width={200}
            height={60}
            className="h-14 w-auto"
          />
          <UserProfileMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Welcome Section */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome to Ceva TMS
            </h1>
            <p className="text-muted-foreground">
              Real-time logistics management and tracking
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Vehicles</CardTitle>
                <Truck className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{activeVehicles}</div>
                <p className="text-xs text-muted-foreground">
                  {totalVehicles} total registered
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active Loads</CardTitle>
                <Package className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{activeLoads}</div>
                <p className="text-xs text-muted-foreground">
                  pending, assigned &amp; in-transit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Deliveries Today</CardTitle>
                <CheckCircle className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{deliveriesToday}</div>
                <p className="text-xs text-muted-foreground">
                  {deliveriesTodayCompleted > 0 && (
                    <span className="text-accent">{deliveriesTodayCompleted} completed</span>
                  )}
                  {deliveriesTodayCompleted > 0 && deliveriesToday - deliveriesTodayCompleted > 0 && ", "}
                  {deliveriesToday - deliveriesTodayCompleted > 0 && `${deliveriesToday - deliveriesTodayCompleted} pending`}
                  {deliveriesToday === 0 && "no deliveries scheduled"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Navigation & Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Quick Navigation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Quick Navigation</CardTitle>
                <CardDescription>Select a portal to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {portals.map((portal) => {
                    const Icon = portal.icon
                    return (
                      <Link key={portal.href} href={portal.href}>
                        <div className="flex flex-col items-center justify-center gap-3 p-6 h-full min-h-[160px] rounded-lg border border-border cursor-pointer transition-all hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5">
                          <div className={`flex h-14 w-14 items-center justify-center rounded-full ${portal.iconBg}`}>
                            <Icon className={`h-7 w-7 ${portal.iconColor}`} />
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">{portal.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{portal.description}</p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-foreground">Recent Activity</CardTitle>
                <CardDescription>Latest loads created</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentLoads.length === 0 && (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
                {recentLoads.map((load) => (
                  <ActivityItem
                    key={load.id}
                    icon={statusIcons[load.status] || <Package className="h-4 w-4 text-muted-foreground" />}
                    title={`${load.load_number} — ${load.status}`}
                    time={timeAgo(load.created_at)}
                    description={`${load.origin} to ${load.destination}${load.client ? ` — ${load.client}` : ""}`}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Fleet Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-foreground">Fleet Status Overview</CardTitle>
              <CardDescription>Current vehicle status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                    <Truck className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">On Active Loads</p>
                    <p className="text-2xl font-bold text-foreground">{fleetInUse}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Not Assigned</p>
                    <p className="text-2xl font-bold text-foreground">{fleetAvailable}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function ActivityItem({
  icon,
  title,
  time,
  description,
}: {
  icon: React.ReactNode
  title: string
  time: string
  description: string
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{icon}</div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <span className="text-xs text-muted-foreground">{time}</span>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
