export type AuditAction = "INSERT" | "UPDATE" | "DELETE"

export type AuditTableName =
  | "loads"
  | "transporters"
  | "horses"
  | "trailers"
  | "drivers"
  | "load_geofence_events"
  | "vehicle_trips"
  | "transporter_documents"

export interface AuditLog {
  id: number
  table_name: AuditTableName
  record_id: string
  action: AuditAction
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  changed_fields: string[] | null
  user_id: string | null
  created_at: string
}

export const AUDIT_TABLE_LABELS: Record<AuditTableName, string> = {
  loads: "Loads",
  transporters: "Transporters",
  horses: "Horses (Trucks)",
  trailers: "Trailers",
  drivers: "Drivers",
  load_geofence_events: "Geofence Events",
  vehicle_trips: "Vehicle Trips",
  transporter_documents: "Transporter Documents",
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
}
