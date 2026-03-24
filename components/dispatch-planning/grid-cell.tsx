"use client"

import React from "react"
import { useDroppable } from "@dnd-kit/core"
import { LoadCard } from "./load-card"
import type { PlanningLoad } from "@/types/planning"

interface GridCellProps {
  id: string
  loads: PlanningLoad[]
  onLoadClick: (load: PlanningLoad) => void
}

export const GridCell = React.memo(function GridCell({ id, loads, onLoadClick }: GridCellProps) {
  const { isOver, setNodeRef } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[80px] border-b border-r border-border p-1.5
        transition-colors duration-150
        ${isOver ? 'bg-primary/10 border-primary border-2' : 'bg-background'}
      `}
    >
      <div className="space-y-1">
        {loads.map((load) => (
          <LoadCard
            key={load.id}
            load={load}
            onClick={() => onLoadClick(load)}
          />
        ))}
      </div>
    </div>
  )
})
