"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Truck,
  Package,
  FileText,
  CreditCard,
  BarChart3,
  Users,
  MapPin,
  Menu,
  Bell,
  Settings,
  MessageSquare,
  Calendar,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react"
import { VehicleTracking } from "./vehicle-tracking"
import { LoadBooking } from "./load-booking"
import { EPODSystem } from "./epod-system"
import { InvoicingPayments } from "./invoicing-payments"
import { AnalyticsReports } from "./analytics-reports"
import { ClientPortal } from "./client-portal"
import Image from "next/image"

export function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-20"} border-r border-border bg-card transition-all duration-300`}>
        <div className="flex h-16 items-center justify-between px-4 border-b border-border">
          {sidebarOpen ? (
            <div className="flex items-center gap-2">
              <Image src="/Ceva_Logo.png" alt="CEVA Logistics" width={140} height={40} className="h-10 w-auto" />
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <Image
                src="/Ceva_Logo.png"
                alt="CEVA Logistics"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
            </div>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        <nav className="space-y-1 p-3">
          <NavItem
            icon={<BarChart3 className="h-5 w-5" />}
            label="Overview"
            active={activeTab === "overview"}
            collapsed={!sidebarOpen}
            onClick={() => setActiveTab("overview")}
          />
          <NavItem
            icon={<MapPin className="h-5 w-5" />}
            label="Vehicle Tracking"
            active={activeTab === "tracking"}
            collapsed={!sidebarOpen}
            onClick={() => setActiveTab("tracking")}
          />
          <NavItem
            icon={<Package className="h-5 w-5" />}
            label="Load Booking"
            active={activeTab === "booking"}
            collapsed={!sidebarOpen}
            onClick={() => setActiveTab("booking")}
          />
          <NavItem
            icon={<FileText className="h-5 w-5" />}
            label="ePOD"
            active={activeTab === "epod"}
            collapsed={!sidebarOpen}
            onClick={() => setActiveTab("epod")}
          />
          <NavItem
            icon={<CreditCard className="h-5 w-5" />}
            label="Invoicing"
            active={activeTab === "invoicing"}
            collapsed={!sidebarOpen}
            onClick={() => setActiveTab("invoicing")}
          />
          <NavItem
            icon={<TrendingUp className="h-5 w-5" />}
            label="Analytics"
            active={activeTab === "analytics"}
            collapsed={!sidebarOpen}
            onClick={() => setActiveTab("analytics")}
          />
          <NavItem
            icon={<Users className="h-5 w-5" />}
            label="Client Portal"
            active={activeTab === "clients"}
            collapsed={!sidebarOpen}
            onClick={() => setActiveTab("clients")}
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {activeTab === "overview" && "Dashboard Overview"}
                {activeTab === "tracking" && "Vehicle Tracking"}
                {activeTab === "booking" && "Load Booking"}
                {activeTab === "epod" && "Electronic Proof of Delivery"}
                {activeTab === "invoicing" && "Invoicing & Payments"}
                {activeTab === "analytics" && "Analytics & Reports"}
                {activeTab === "clients" && "Client Portal"}
              </h2>
              <p className="text-sm text-muted-foreground">Real-time logistics management and tracking</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6">
          {activeTab === "overview" && <DashboardOverview />}
          {activeTab === "tracking" && <VehicleTracking />}
          {activeTab === "booking" && <LoadBooking />}
          {activeTab === "epod" && <EPODSystem />}
          {activeTab === "invoicing" && <InvoicingPayments />}
          {activeTab === "analytics" && <AnalyticsReports />}
          {activeTab === "clients" && <ClientPortal />}
        </div>
      </main>
    </div>
  )
}

function NavItem({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  )
}

function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">127</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-accent">+12%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Loads</CardTitle>
            <Package className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">384</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-accent">+8%</span> from last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Invoices</CardTitle>
            <CreditCard className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">R245K</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-destructive">45</span> invoices pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deliveries Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">89</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-accent">67 completed</span>, 22 pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Package className="mr-2 h-4 w-4" />
              Create New Load
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Truck className="mr-2 h-4 w-4" />
              Assign Vehicle
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Generate Invoice
            </Button>
            <Button className="w-full justify-start bg-transparent" variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Plan Route
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription>Latest updates and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ActivityItem
              icon={<CheckCircle className="h-4 w-4 text-accent" />}
              title="Load #L-2847 delivered"
              time="5 min ago"
              description="Johannesburg to Cape Town - Client: ABC Logistics"
            />
            <ActivityItem
              icon={<AlertCircle className="h-4 w-4 text-destructive" />}
              title="Vehicle GP-01-AB-1234 maintenance due"
              time="1 hour ago"
              description="Schedule service within 3 days"
            />
            <ActivityItem
              icon={<CreditCard className="h-4 w-4 text-primary" />}
              title="Invoice #INV-8392 paid"
              time="2 hours ago"
              description="Payment received: R245,000"
            />
            <ActivityItem
              icon={<Package className="h-4 w-4 text-secondary" />}
              title="New load booked: #L-2851"
              time="3 hours ago"
              description="Durban to Pretoria - 15 tons"
            />
          </CardContent>
        </Card>
      </div>

      {/* Current Status */}
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
                <p className="text-sm font-medium text-muted-foreground">In Transit</p>
                <p className="text-2xl font-bold text-foreground">78</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/20">
                <MapPin className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">At Loading Points</p>
                <p className="text-2xl font-bold text-foreground">23</p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-foreground">26</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
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
