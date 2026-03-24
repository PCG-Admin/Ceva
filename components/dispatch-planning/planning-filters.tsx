"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MATERIAL_LABELS } from "./material-colors"

interface PlanningFiltersProps {
  clientFilter: string
  onClientFilterChange: (v: string) => void
  materialFilter: string
  onMaterialFilterChange: (v: string) => void
  transporterFilter: string
  onTransporterFilterChange: (v: string) => void
  clients: string[]
  transporters: { id: string; name: string }[]
}

export function PlanningFilters({
  clientFilter,
  onClientFilterChange,
  materialFilter,
  onMaterialFilterChange,
  transporterFilter,
  onTransporterFilterChange,
  clients,
  transporters,
}: PlanningFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={clientFilter} onValueChange={onClientFilterChange}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue placeholder="All Clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={materialFilter} onValueChange={onMaterialFilterChange}>
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="All Materials" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Materials</SelectItem>
          {Object.entries(MATERIAL_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border mx-1" />

      <Select value={transporterFilter} onValueChange={onTransporterFilterChange}>
        <SelectTrigger className="w-[160px] h-8 text-xs">
          <SelectValue placeholder="All Transporters" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Transporters</SelectItem>
          {transporters.map((t) => (
            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
