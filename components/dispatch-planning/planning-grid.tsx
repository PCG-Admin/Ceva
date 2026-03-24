"use client"

import React, { useMemo } from "react"
import { format, addDays } from "date-fns"
import { VehicleColumnHeader } from "./vehicle-column-header"
import { GridCell } from "./grid-cell"
import { WeeklySummary } from "./weekly-summary"
import type { PlanningLoad, PlanningHorse, GridCellKey } from "@/types/planning"

interface PlanningGridProps {
  weekStart: Date
  horses: PlanningHorse[]
  assignedLoads: Map<GridCellKey, PlanningLoad[]>
  onLoadClick: (load: PlanningLoad) => void
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const PlanningGrid = React.memo(function PlanningGrid({
  weekStart,
  horses,
  assignedLoads,
  onLoadClick,
}: PlanningGridProps) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  )

  const gridCols = `80px repeat(${horses.length}, minmax(200px, 1fr))`

  if (horses.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-8">
        No vehicles found. Add horses in Transporter Management to start planning.
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto border border-border rounded-lg bg-card">
      {/* Header row — sticky top */}
      <div
        className="grid sticky top-0 z-20 bg-card"
        style={{ gridTemplateColumns: gridCols }}
      >
        <div className="border-b border-r border-border p-2 flex items-end">
          <span className="text-xs font-semibold text-muted-foreground">Day</span>
        </div>
        {horses.map((horse) => (
          <VehicleColumnHeader key={horse.id} horse={horse} />
        ))}
      </div>

      {/* Day rows */}
      {days.map((day, dayIndex) => {
        const dateStr = format(day, 'yyyy-MM-dd')
        const isWeekend = dayIndex >= 5

        return (
          <div
            key={dateStr}
            className="grid"
            style={{ gridTemplateColumns: gridCols }}
          >
            {/* Day label — sticky left */}
            <div
              className={`
                sticky left-0 z-10 border-b border-r border-border p-2
                ${isWeekend ? 'bg-muted/50' : 'bg-card'}
              `}
            >
              <div className="text-xs font-semibold">{DAY_LABELS[dayIndex]}</div>
              <div className="text-[10px] text-muted-foreground">{format(day, 'dd MMM')}</div>
            </div>

            {/* Cells for each horse */}
            {horses.map((horse) => {
              const cellKey = `${horse.id}:${dateStr}` as GridCellKey
              const cellLoads = assignedLoads.get(cellKey) || []

              return (
                <GridCell
                  key={cellKey}
                  id={cellKey}
                  loads={cellLoads}
                  onLoadClick={onLoadClick}
                />
              )
            })}
          </div>
        )
      })}

      {/* Summary row */}
      <WeeklySummary
        horses={horses}
        assignedLoads={assignedLoads}
        weekStart={weekStart}
        gridCols={gridCols}
      />
    </div>
  )
})
