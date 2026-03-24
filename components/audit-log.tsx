"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Package,
  Truck,
  Container,
  User,
  Building2,
  MapPin,
  Route,
  FileText,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Bot,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  AuditLog,
  AuditTableName,
  AuditAction,
  AUDIT_TABLE_LABELS,
  AUDIT_ACTION_LABELS,
} from "@/types/audit"

const PAGE_SIZE = 25

const TABLE_ICONS: Record<AuditTableName, React.ReactNode> = {
  loads: <Package className="h-4 w-4" />,
  transporters: <Building2 className="h-4 w-4" />,
  horses: <Truck className="h-4 w-4" />,
  trailers: <Container className="h-4 w-4" />,
  drivers: <User className="h-4 w-4" />,
  load_geofence_events: <MapPin className="h-4 w-4" />,
  vehicle_trips: <Route className="h-4 w-4" />,
  transporter_documents: <FileText className="h-4 w-4" />,
}

const ACTION_ICONS: Record<AuditAction, React.ReactNode> = {
  INSERT: <Plus className="h-3 w-3" />,
  UPDATE: <Pencil className="h-3 w-3" />,
  DELETE: <Trash2 className="h-3 w-3" />,
}

const ACTION_COLORS: Record<AuditAction, string> = {
  INSERT: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  UPDATE: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  DELETE: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

function getRecordIdentifier(log: AuditLog): string {
  const data = log.new_data || log.old_data
  if (!data) return log.record_id.substring(0, 8)
  if (data.load_number) return data.load_number as string
  if (data.order_number) return data.order_number as string
  if (data.registration_number) return data.registration_number as string
  if (data.company_name) return data.company_name as string
  if (data.first_name && data.last_name) return `${data.first_name} ${data.last_name}`
  if (data.event_type) return data.event_type as string
  if (data.file_name) return data.file_name as string
  return log.record_id.substring(0, 8)
}

function describeAuditEvent(log: AuditLog): string {
  const entityLabels: Record<string, string> = {
    loads: "Load",
    transporters: "Transporter",
    horses: "Horse",
    trailers: "Trailer",
    drivers: "Driver",
    load_geofence_events: "Geofence event",
    vehicle_trips: "Vehicle trip",
    transporter_documents: "Document",
  }

  const entity = entityLabels[log.table_name] || log.table_name
  const identifier = getRecordIdentifier(log)

  if (log.action === "INSERT") {
    return `${entity} "${identifier}" was created`
  }
  if (log.action === "DELETE") {
    return `${entity} "${identifier}" was deleted`
  }

  // UPDATE — highlight status change if present
  if (log.changed_fields?.includes("status")) {
    const oldStatus = log.old_data?.status as string
    const newStatus = log.new_data?.status as string
    return `${entity} "${identifier}" status changed from "${oldStatus}" to "${newStatus}"`
  }

  if (log.changed_fields?.includes("verified") && log.new_data?.verified === true) {
    return `${entity} "${identifier}" was verified`
  }

  const fieldCount = log.changed_fields?.length || 0
  return `${entity} "${identifier}" was updated (${fieldCount} field${fieldCount !== 1 ? "s" : ""})`
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string
}

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Filters
  const [tableFilter, setTableFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  // User profiles cache
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({})

  const supabase = createClient()

  const fetchLogs = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from("ceva_audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (tableFilter !== "all") query = query.eq("table_name", tableFilter)
    if (actionFilter !== "all") query = query.eq("action", actionFilter)
    if (dateFrom) query = query.gte("created_at", dateFrom + "T00:00:00Z")
    if (dateTo) query = query.lte("created_at", dateTo + "T23:59:59Z")

    const { data, error, count } = await query

    if (error) {
      console.error("Error fetching audit logs:", error.message)
      setLogs([])
      setTotalCount(0)
    } else {
      setLogs((data as AuditLog[]) || [])
      setTotalCount(count || 0)

      // Fetch user profiles for any user_ids we don't have yet
      const userIds = [...new Set(
        (data || [])
          .map((l: AuditLog) => l.user_id)
          .filter((id): id is string => id !== null)
      )]
      const missingIds = userIds.filter((id) => !userProfiles[id])
      if (missingIds.length > 0) {
        const { data: profiles } = await supabase
          .from("ceva_profiles")
          .select("id, full_name, email")
          .in("id", missingIds)
        if (profiles) {
          setUserProfiles((prev) => {
            const next = { ...prev }
            for (const p of profiles) {
              next[p.id] = p
            }
            return next
          })
        }
      }
    }

    setLoading(false)
  }, [page, tableFilter, actionFilter, dateFrom, dateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [tableFilter, actionFilter, dateFrom, dateTo])

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Audit Log</h2>
        <p className="text-sm text-muted-foreground">
          Track all changes across the system
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Entity</label>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Entities</SelectItem>
                  {Object.entries(AUDIT_TABLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Action</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">
              {loading ? "Loading..." : `${totalCount} event${totalCount !== 1 ? "s" : ""}`}
            </CardTitle>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No audit events found
            </p>
          ) : (
            <div className="space-y-1">
              {logs.map((log) => {
                const isExpanded = expandedId === log.id
                const profile = log.user_id ? userProfiles[log.user_id] : null

                return (
                  <div key={log.id} className="border border-border rounded-lg">
                    <button
                      className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors rounded-lg"
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      {/* Expand icon */}
                      {log.action === "UPDATE" ? (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )
                      ) : (
                        <div className="w-4" />
                      )}

                      {/* Entity icon */}
                      <div className="shrink-0 text-muted-foreground">
                        {TABLE_ICONS[log.table_name]}
                      </div>

                      {/* Action badge */}
                      <Badge
                        variant="secondary"
                        className={`shrink-0 text-xs gap-1 ${ACTION_COLORS[log.action]}`}
                      >
                        {ACTION_ICONS[log.action]}
                        {AUDIT_ACTION_LABELS[log.action]}
                      </Badge>

                      {/* Description */}
                      <span className="text-sm text-foreground truncate flex-1">
                        {describeAuditEvent(log)}
                      </span>

                      {/* User */}
                      <span className="text-xs text-muted-foreground shrink-0">
                        {log.user_id
                          ? profile?.full_name || profile?.email || "User"
                          : (
                            <span className="flex items-center gap-1">
                              <Bot className="h-3 w-3" />
                              System
                            </span>
                          )}
                      </span>

                      {/* Timestamp */}
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {new Date(log.created_at).toLocaleDateString()}{" "}
                        {new Date(log.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </button>

                    {/* Expanded diff view */}
                    {isExpanded && log.action === "UPDATE" && log.changed_fields && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="ml-8 border border-border rounded-md overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Field</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Old Value</th>
                                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">New Value</th>
                              </tr>
                            </thead>
                            <tbody>
                              {log.changed_fields.map((field) => (
                                <tr key={field} className="border-t border-border">
                                  <td className="px-3 py-2 font-medium text-foreground">
                                    {formatFieldName(field)}
                                  </td>
                                  <td className="px-3 py-2 text-red-600 dark:text-red-400">
                                    {formatFieldValue(log.old_data?.[field])}
                                  </td>
                                  <td className="px-3 py-2 text-green-600 dark:text-green-400">
                                    {formatFieldValue(log.new_data?.[field])}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Bottom pagination */}
          {totalPages > 1 && !loading && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
