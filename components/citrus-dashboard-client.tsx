"use client"

/**
 * CEVA Citrus Tracking Dashboard - Client Component
 * SOW Section 3.1.3 - Real-time load tracking for client viewing
 */

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CitrusMilestoneTimeline, CitrusFullScreenDashboard } from './citrus-milestone-timeline'
import type { CitrusLoadMilestones } from '@/types/citrus-milestones'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface LoadWithMilestones {
  id: string
  load_number: string
  client: string
  client_id: string | null
  origin: string
  destination: string
  status: string
  manifest_number: string | null
  controller: string | null
  pickup_date: string
  delivery_date: string
  date_loaded: string | null
  date_arrived_border_sa: string | null
  date_johannesburg: string | null
  date_harrismith: string | null
  date_durban_arrival: string | null
  date_offloaded: string | null
  supplier?: { company_name: string; trading_name: string | null }[] | null
  driver?: { first_name: string; last_name: string }[] | null
}

interface CitrusDashboardClientProps {
  isClientView?: boolean // If true, optimized for client premises display
}

export function CitrusDashboardClient({ isClientView = false }: CitrusDashboardClientProps = {}) {
  const [loads, setLoads] = useState<LoadWithMilestones[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [fullScreen, setFullScreen] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true) // Always on
  const [mounted, setMounted] = useState(false)

  const supabase = createClient()

  const fetchLoads = useCallback(async () => {
    // RLS policies will automatically filter loads based on user role
    // Client users will only see their own loads
    const { data, error } = await supabase
      .from('ceva_loads')
      .select(`
        id,
        load_number,
        client,
        client_id,
        origin,
        destination,
        status,
        manifest_number,
        controller,
        pickup_date,
        delivery_date,
        date_loaded,
        date_arrived_border_sa,
        date_johannesburg,
        date_harrismith,
        date_durban_arrival,
        date_offloaded,
        supplier:ceva_transporters!supplier_id(company_name, trading_name),
        driver:ceva_drivers!driver_id(first_name, last_name)
      `)
      .in('status', ['assigned', 'in_transit'])
      .gte('pickup_date', '2026-03-01') // SOW: 2026 citrus season
      .lte('pickup_date', '2026-10-31')
      .order('pickup_date', { ascending: false })

    if (error) {
      console.error('Error fetching citrus loads:', error)
    } else {
      setLoads(data || [])
      setLastUpdated(new Date())
    }
    setLoading(false)
  }, [supabase, isClientView])

  useEffect(() => {
    setMounted(true)
    fetchLoads()
  }, [fetchLoads])

  // Auto-refresh every 30 seconds if enabled
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchLoads()
    }, 30000)

    return () => clearInterval(interval)
  }, [autoRefresh, fetchLoads])

  const toggleFullScreen = () => {
    if (!fullScreen) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setFullScreen(!fullScreen)
  }

  if (fullScreen) {
    const dashboardLoads = loads.map(load => ({
      load_number: load.load_number,
      client: load.client,
      origin: load.origin,
      destination: load.destination,
      milestones: {
        date_loaded: load.date_loaded ? new Date(load.date_loaded) : null,
        date_arrived_border_sa: load.date_arrived_border_sa ? new Date(load.date_arrived_border_sa) : null,
        date_johannesburg: load.date_johannesburg ? new Date(load.date_johannesburg) : null,
        date_harrismith: load.date_harrismith ? new Date(load.date_harrismith) : null,
        date_durban_arrival: load.date_durban_arrival ? new Date(load.date_durban_arrival) : null,
        date_offloaded: load.date_offloaded ? new Date(load.date_offloaded) : null,
      }
    }))

    return (
      <div>
        <button
          onClick={toggleFullScreen}
          className="fixed top-4 right-4 z-50 p-3 bg-white/90 dark:bg-slate-900/90 rounded-lg shadow-lg hover:bg-white dark:hover:bg-slate-800"
          aria-label="Exit fullscreen"
        >
          <Minimize2 className="h-6 w-6" />
        </button>
        <CitrusFullScreenDashboard loads={dashboardLoads} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - only show for non-client view */}
      {!isClientView && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Citrus Transport Tracking</h1>
            <p className="text-muted-foreground mt-1">
              Live status for active citrus loads - 2026 Season
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLoads()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFullScreen}
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Full Screen
            </Button>
          </div>
        </div>
      )}

      {/* Client view header - compact with controls */}
      {isClientView && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLoads()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={toggleFullScreen}
          >
            <Maximize2 className="h-4 w-4 mr-2" />
            Full Screen Display
          </Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Loads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loads.length}</div>
            <p className="text-xs text-muted-foreground mt-1">In transit or assigned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {loads.filter(l => l.status === 'in_transit').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Currently moving</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {loads.filter(l => l.status === 'assigned').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready to depart</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Last Updated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {mounted && lastUpdated ? format(lastUpdated, 'HH:mm:ss') : '--:--:--'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Loads List */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading loads...
            </CardContent>
          </Card>
        ) : loads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No active citrus loads found</p>
              <p className="text-sm text-muted-foreground mt-2">
                Loads will appear here when they are assigned or in transit
              </p>
            </CardContent>
          </Card>
        ) : (
          loads.map(load => {
            const milestones: CitrusLoadMilestones = {
              date_loaded: load.date_loaded ? new Date(load.date_loaded) : null,
              date_arrived_border_sa: load.date_arrived_border_sa ? new Date(load.date_arrived_border_sa) : null,
              date_johannesburg: load.date_johannesburg ? new Date(load.date_johannesburg) : null,
              date_harrismith: load.date_harrismith ? new Date(load.date_harrismith) : null,
              date_durban_arrival: load.date_durban_arrival ? new Date(load.date_durban_arrival) : null,
              date_offloaded: load.date_offloaded ? new Date(load.date_offloaded) : null,
            }

            const supplier = Array.isArray(load.supplier) ? load.supplier[0] : load.supplier
            const driver = Array.isArray(load.driver) ? load.driver[0] : load.driver

            return (
              <Card key={load.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <CardTitle>{load.load_number}</CardTitle>
                        {load.manifest_number && (
                          <Badge variant="outline">
                            Manifest: {load.manifest_number}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2 space-y-1">
                        <div><strong>Client:</strong> {load.client}</div>
                        <div><strong>Route:</strong> {load.origin} → {load.destination}</div>
                        {supplier && (
                          <div><strong>Transporter:</strong> {supplier.trading_name || supplier.company_name}</div>
                        )}
                        {driver && (
                          <div><strong>Driver:</strong> {driver.first_name} {driver.last_name}</div>
                        )}
                        {load.controller && (
                          <div><strong>Controller:</strong> {load.controller}</div>
                        )}
                      </CardDescription>
                    </div>
                    <Badge variant={load.status === 'in_transit' ? 'default' : 'secondary'}>
                      {load.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <CitrusMilestoneTimeline
                    milestoneData={milestones}
                    showProgress={true}
                    compact={false}
                  />
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
