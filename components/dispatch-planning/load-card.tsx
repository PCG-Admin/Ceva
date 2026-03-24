"use client"

import React from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, ArrowRight, AlertTriangle } from "lucide-react"
import { getMaterialColor, MATERIAL_LABELS } from "./material-colors"
import type { PlanningLoad } from "@/types/planning"

interface LoadCardProps {
  load: PlanningLoad
  isOverlay?: boolean
  onClick?: () => void
}

export const LoadCard = React.memo(function LoadCard({ load, isOverlay, onClick }: LoadCardProps) {
  const isDragDisabled = load.status === 'in-transit' || load.status === 'delivered'

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: load.id,
    data: { load },
    disabled: isDragDisabled,
  })

  const style = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined

  const colors = getMaterialColor(load.material)
  const materialLabel = MATERIAL_LABELS[load.material] || load.material

  return (
    <div
      ref={isOverlay ? undefined : setNodeRef}
      style={isOverlay ? undefined : style}
      className={`
        rounded-md border text-xs cursor-grab active:cursor-grabbing select-none
        ${colors.border} bg-card
        ${isDragging ? 'opacity-30' : ''}
        ${isOverlay ? 'shadow-lg ring-2 ring-primary/30 rotate-2' : ''}
        ${isDragDisabled ? 'opacity-60 cursor-default' : ''}
      `}
      onClick={isDragging ? undefined : onClick}
      {...(isOverlay ? {} : { ...listeners, ...attributes })}
    >
      <div className="p-1.5 space-y-0.5">
        <div className="flex items-center gap-1">
          {!isDragDisabled && !isOverlay && (
            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
          )}
          <span className={`inline-block px-1 rounded text-[10px] font-medium ${colors.bg} ${colors.text}`}>
            {materialLabel}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto font-mono flex items-center gap-1.5">
            {load.weight != null && <span>{load.weight} t</span>}
            <span>R{load.rate.toLocaleString()}</span>
          </span>
        </div>
        <div className="flex items-center gap-0.5 text-[11px] min-w-0">
          <span className="truncate" title={load.origin}>{load.origin}</span>
          <ArrowRight className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
          <span className="truncate" title={load.destination}>{load.destination}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="truncate">{load.client}</span>
          {load.horse_id && (!load.trailer_id || !load.driver_id) && (
            <span title={`Missing: ${[!load.trailer_id && "Trailer", !load.driver_id && "Driver"].filter(Boolean).join(", ")}`}>
              <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            </span>
          )}
        </div>
      </div>
    </div>
  )
})
