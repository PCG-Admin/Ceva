"use client"

/**
 * Client Analytics Component
 * Shows analytics and performance metrics for client loads
 */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Calendar
} from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

interface LoadStats {
  total: number
  delivered: number
  inTransit: number
  pending: number
  cancelled: number
  onTime: number
  delayed: number
  avgTransitDays: number
}

export function ClientAnalytics() {
  const [stats, setStats] = useState<LoadStats>({
    total: 0,
    delivered: 0,
    inTransit: 0,
    pending: 0,
    cancelled: 0,
    onTime: 0,
    delayed: 0,
    avgTransitDays: 0,
  })
  const [recentLoads, setRecentLoads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        // Fetch all loads for the client (RLS filters automatically)
        const { data: loads, error } = await supabase
          .from('ceva_loads')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error

        if (loads && loads.length > 0) {
          // Calculate statistics
          const delivered = loads.filter(l => l.status === 'delivered').length
          const inTransit = loads.filter(l => l.status === 'in_transit').length
          const pending = loads.filter(l => l.status === 'pending' || l.status === 'assigned').length
          const cancelled = loads.filter(l => l.status === 'cancelled').length

          // Calculate on-time vs delayed deliveries
          const deliveredLoads = loads.filter(l => l.status === 'delivered' && l.date_offloaded && l.delivery_date)
          let onTime = 0
          let delayed = 0
          let totalTransitDays = 0

          deliveredLoads.forEach(load => {
            const deliveryDate = parseISO(load.delivery_date)
            const actualDate = parseISO(load.date_offloaded)

            if (actualDate <= deliveryDate) {
              onTime++
            } else {
              delayed++
            }

            // Calculate transit time
            if (load.date_loaded) {
              const transitDays = differenceInDays(actualDate, parseISO(load.date_loaded))
              totalTransitDays += transitDays
            }
          })

          const avgTransitDays = deliveredLoads.length > 0
            ? Math.round(totalTransitDays / deliveredLoads.length)
            : 0

          setStats({
            total: loads.length,
            delivered,
            inTransit,
            pending,
            cancelled,
            onTime,
            delayed,
            avgTransitDays,
          })

          // Get recent loads for display
          setRecentLoads(loads.slice(0, 10))
        }
      } catch (error) {
        console.error('Error fetching analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  const deliveryRate = stats.delivered > 0
    ? Math.round((stats.onTime / stats.delivered) * 100)
    : 0

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Loading your performance metrics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Performance insights and statistics for your loads
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Loads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.total > 0 ? Math.round((stats.delivered / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              In Transit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.inTransit}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Avg Transit Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgTransitDays}</div>
            <p className="text-xs text-muted-foreground mt-1">Days</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Delivery Performance
            </CardTitle>
            <CardDescription>On-time delivery rate</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">On-Time Deliveries</span>
              <Badge variant="default" className="bg-green-600">
                {deliveryRate}%
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  On Time
                </span>
                <span className="font-medium">{stats.onTime}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Delayed
                </span>
                <span className="font-medium">{stats.delayed}</span>
              </div>
            </div>

            {deliveryRate >= 90 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-green-600 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Excellent performance!
                </p>
              </div>
            )}
            {deliveryRate < 90 && deliveryRate >= 75 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-blue-600 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Good performance
                </p>
              </div>
            )}
            {deliveryRate < 75 && stats.delivered > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-amber-600 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Room for improvement
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Load Status Breakdown
            </CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Pending/Assigned</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-600"
                    style={{ width: `${stats.total > 0 ? (stats.pending / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{stats.pending}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">In Transit</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${stats.total > 0 ? (stats.inTransit / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{stats.inTransit}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">Delivered</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600"
                    style={{ width: `${stats.total > 0 ? (stats.delivered / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right">{stats.delivered}</span>
              </div>
            </div>
            {stats.cancelled > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm">Cancelled</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-600"
                      style={{ width: `${stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{stats.cancelled}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Loads */}
      {recentLoads.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Loads
            </CardTitle>
            <CardDescription>Your latest shipments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLoads.map((load) => (
                <div key={load.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1">
                    <div className="font-medium">{load.load_number}</div>
                    <div className="text-sm text-muted-foreground">
                      {load.origin} → {load.destination}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        load.status === 'delivered' ? 'default' :
                        load.status === 'in_transit' ? 'secondary' :
                        'outline'
                      }
                      className={
                        load.status === 'delivered' ? 'bg-green-600' :
                        load.status === 'in_transit' ? 'bg-blue-600' :
                        ''
                      }
                    >
                      {load.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <div className="text-xs text-muted-foreground mt-1">
                      {format(parseISO(load.pickup_date), 'dd MMM yyyy')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.total === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No data available</h3>
            <p className="text-muted-foreground">
              Analytics will be displayed once you have loads in the system
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
