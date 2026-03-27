"use client"

import type { PlanningHorse } from "@/types/planning"

interface VehicleColumnHeaderProps {
  horse: PlanningHorse
}

export function VehicleColumnHeader({ horse }: VehicleColumnHeaderProps) {
  const transporter = horse.transporter[0]
  const transporterName = transporter?.trading_name || transporter?.company_name || 'Unknown'

  return (
    <div className="p-2 border-b border-r border-border bg-card">
      <div className="text-xs font-semibold truncate" title={horse.registration_number}>
        {horse.registration_number}
      </div>
      {horse.make && (
        <div className="text-xs text-muted-foreground truncate">
          {horse.make} {horse.model || ''}
        </div>
      )}
      <div className="text-xs text-muted-foreground truncate" title={transporterName}>
        {transporterName}
      </div>
    </div>
  )
}
