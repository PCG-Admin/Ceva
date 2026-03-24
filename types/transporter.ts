// Transporter Management Types

export type TransporterStatus = 'pending' | 'approved' | 'suspended'
export type DocumentType = 'bank_proof' | 'vat_certificate' | 'git_confirmation' | 'other'
export type DriverDocumentType = 'id_document' | 'drivers_license' | 'prdp' | 'other'
export type VehicleStatus = 'available' | 'in_use' | 'maintenance' | 'inactive'
export type TrailerType = 'side_tipper' | 'bottom_dumper' | 'drop_side' | 'flat'
export type DriverStatus = 'active' | 'inactive' | 'suspended'

export interface Transporter {
  id: string
  company_name: string
  trading_name: string | null
  registration_number: string | null
  vat_number: string | null
  physical_address: string | null
  postal_address: string | null
  contact_person: string | null
  contact_email: string | null
  contact_phone: string | null
  bank_name: string | null
  bank_account_number: string | null
  bank_branch_code: string | null
  bank_account_type: string | null
  status: TransporterStatus
  notes: string | null
  created_by: string | null
  company_id: string | null
  created_at: string
  updated_at: string
}

export interface TransporterDocument {
  id: string
  transporter_id: string
  document_type: DocumentType
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  verified: boolean
  verified_by: string | null
  verified_at: string | null
  notes: string | null
}

export interface Horse {
  id: string
  transporter_id: string
  registration_number: string
  make: string | null
  model: string | null
  year: number | null
  vin_number: string | null
  engine_number: string | null
  color: string | null
  license_expiry: string | null
  tracking_provider: string | null
  tracking_unit_id: string | null
  status: VehicleStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Trailer {
  id: string
  transporter_id: string
  registration_number: string
  trailer_type: TrailerType
  length_meters: number | null
  max_payload_tons: number | null
  tare_weight_tons: number | null
  license_expiry: string | null
  status: VehicleStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Driver {
  id: string
  transporter_id: string
  first_name: string
  last_name: string
  id_number: string | null
  passport_number: string | null
  license_number: string | null
  license_type: string | null
  license_expiry: string | null
  prdp_number: string | null
  prdp_expiry: string | null
  contact_phone: string | null
  contact_email: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  status: DriverStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DriverDocument {
  id: string
  driver_id: string
  document_type: DriverDocumentType
  file_name: string
  file_path: string
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  expiry_date: string | null
  verified: boolean
  verified_by: string | null
  verified_at: string | null
  notes: string | null
}

export interface VehicleCombination {
  id: string
  transporter_id: string
  combination_name: string | null
  horse_id: string
  trailer1_id: string
  trailer2_id: string | null
  driver_id: string
  is_active: boolean
  notes: string | null
  created_at: string
  updated_at: string
  // Joined relations (optional, for display)
  horse?: Horse
  trailer1?: Trailer
  trailer2?: Trailer | null
  driver?: Driver
}

// Form types for creating/updating
export type TransporterFormData = Omit<Transporter, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'company_id'>
export type HorseFormData = Omit<Horse, 'id' | 'created_at' | 'updated_at' | 'transporter_id'>
export type TrailerFormData = Omit<Trailer, 'id' | 'created_at' | 'updated_at' | 'transporter_id'>
export type DriverFormData = Omit<Driver, 'id' | 'created_at' | 'updated_at' | 'transporter_id'>
export type VehicleCombinationFormData = Omit<VehicleCombination, 'id' | 'created_at' | 'updated_at' | 'transporter_id' | 'horse' | 'trailer1' | 'trailer2' | 'driver'>

// Document type labels for UI
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  bank_proof: 'Proof of Bank Details',
  vat_certificate: 'VAT Certificate',
  git_confirmation: 'Confirmation of GIT',
  other: 'Other Document',
}

// Driver document type labels for UI
export const DRIVER_DOCUMENT_TYPE_LABELS: Record<DriverDocumentType, string> = {
  id_document: 'ID Document',
  drivers_license: "Driver's License",
  prdp: 'PrDP (Professional Driving Permit)',
  other: 'Other Document',
}

// Trailer type labels for UI
export const TRAILER_TYPE_LABELS: Record<TrailerType, string> = {
  side_tipper: 'Side Tippers',
  bottom_dumper: 'Bottom Dumpers',
  drop_side: 'Drop Sides',
  flat: 'Flat',
}

// Status labels for UI
export const TRANSPORTER_STATUS_LABELS: Record<TransporterStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  suspended: 'Suspended',
}

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: 'Available',
  in_use: 'In Use',
  maintenance: 'Maintenance',
  inactive: 'Inactive',
}

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  suspended: 'Suspended',
}
