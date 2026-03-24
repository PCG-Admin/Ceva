export interface PlanningLoad {
  id: string
  load_number: string
  order_number: string
  client: string
  origin: string
  destination: string
  pickup_date: string
  delivery_date: string
  material: string
  weight: number | null
  rate: number
  status: 'pending' | 'assigned' | 'in-transit' | 'delivered' | 'cancelled'
  supplier_id: string | null
  horse_id: string | null
  trailer_id: string | null
  trailer2_id: string | null
  driver_id: string | null
  contract_id: string | null
  notes: string | null
  // Joined relations
  supplier?: { company_name: string; trading_name: string | null } | null
  horse?: { registration_number: string } | null
}

export interface PlanningHorse {
  id: string
  registration_number: string
  make: string | null
  model: string | null
  status: string
  transporter_id: string
  transporter: { id: string; company_name: string; trading_name: string | null }
}

export type GridCellKey = `${string}:${string}`
