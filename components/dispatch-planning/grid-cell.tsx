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
  const loadCount = loads.length

  return (
    <div
      ref={setNodeRef}
      className={`
        min-h-[100px] border border-border p-2 relative rounded
        transition-all duration-150
        ${isOver ? 'bg-primary/10 border-primary border-2 scale-[1.02]' : 'bg-card hover:bg-muted/20'}
        ${loadCount > 0 ? 'bg-blue-50/30 dark:bg-blue-950/10' : ''}
      `}
    >
      {loadCount > 0 && (
        <div className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 shadow-sm">
          {loadCount}
        </div>
      )}
      <div className="space-y-1.5">
        {loads.map((load) => (
          <LoadCard
            key={load.id}
            load={load}
            onClick={() => onLoadClick(load)}
          />
        ))}
      </div>
      {loadCount === 0 && isOver && (
        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
          Drop here
        </div>
      )}
    </div>
  )
})
