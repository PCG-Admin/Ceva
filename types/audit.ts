export type AuditAction = "INSERT" | "UPDATE" | "DELETE"

export type AuditTableName =
  | "ceva_loads"
  | "ceva_transporters"
  | "ceva_horses"
  | "ceva_trailers"
  | "ceva_drivers"
  | "ceva_load_geofence_events"
  | "ceva_vehicle_trips"
  | "ceva_transporter_documents"

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
  ceva_loads: "Loads",
  ceva_transporters: "Transporters",
  ceva_horses: "Horses (Trucks)",
  ceva_trailers: "Trailers",
  ceva_drivers: "Drivers",
  ceva_load_geofence_events: "Geofence Events",
  ceva_vehicle_trips: "Vehicle Trips",
  ceva_transporter_documents: "Transporter Documents",
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: "Created",
  UPDATE: "Updated",
  DELETE: "Deleted",
}
