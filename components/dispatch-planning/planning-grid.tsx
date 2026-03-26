"use client"

import React, { useMemo } from "react"
import { format, addDays, getDaysInMonth, startOfMonth, getDay } from "date-fns"
import { VehicleColumnHeader } from "./vehicle-column-header"
import { GridCell } from "./grid-cell"
import { LoadCard } from "./load-card"
import { WeeklySummary } from "./weekly-summary"
import type { PlanningLoad, PlanningHorse, GridCellKey } from "@/types/planning"

interface PlanningGridProps {
  weekStart: Date
  horses: PlanningHorse[]
  assignedLoads: Map<GridCellKey, PlanningLoad[]>
  onLoadClick: (load: PlanningLoad) => void
  viewMode?: "week" | "month"
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export const PlanningGrid = React.memo(function PlanningGrid({
  weekStart,
  horses,
  assignedLoads,
  onLoadClick,
  viewMode = "week",
}: PlanningGridProps) {
  const days = useMemo(() => {
    if (viewMode === "month") {
      const monthStart = startOfMonth(weekStart)
      const daysInMonth = getDaysInMonth(monthStart)
      return Array.from({ length: daysInMonth }, (_, i) => addDays(monthStart, i))
    }
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  }, [weekStart, viewMode])

  const gridCols = `80px repeat(${horses.length}, minmax(200px, 1fr))`

  // If no horses, show full calendar grid by date only
  if (horses.length === 0) {
    const dayOfWeek = (day: Date) => {
      const d = getDay(day)
      return d === 0 ? 6 : d - 1 // Convert Sunday=0 to Sunday=6, Monday=1 to Monday=0, etc.
    }

    return (
      <div className="flex-1 overflow-auto border border-border rounded-lg bg-card">
        <div className="sticky top-0 z-20 bg-muted/80 border-b p-3">
          <p className="font-semibold text-sm text-center">Date-Based Calendar</p>
          <p className="text-xs text-muted-foreground text-center">
            Drag loads to different dates to reschedule • Add vehicles to enable vehicle assignment
          </p>
        </div>

        {/* Calendar Grid */}
        <div className="p-4">
          <div className="grid grid-cols-7 gap-2">
            {/* Day headers */}
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <div key={day} className="text-center font-semibold text-xs text-muted-foreground pb-2 border-b">
                {day}
              </div>
            ))}

            {/* Calendar cells */}
            {days.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const cellKey = `no-horse:${dateStr}` as GridCellKey
              const cellLoads = assignedLoads.get(cellKey) || []
              const isWeekend = dayOfWeek(day) >= 5
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr

              return (
                <div key={dateStr} className="relative">
                  {/* Date label at top of cell */}
                  <div className={`
                    text-center py-1 text-xs font-semibold
                    ${isToday ? 'bg-primary text-primary-foreground rounded-t' : 'text-muted-foreground'}
                    ${isWeekend ? 'bg-muted/30' : ''}
                  `}>
                    {format(day, 'd')}
                  </div>
                  <GridCell
                    id={dateStr}
                    loads={cellLoads}
                    onLoadClick={onLoadClick}
                  />
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-4 border-t bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold uppercase text-muted-foreground">Total for {viewMode === "month" ? "Month" : "Week"}</div>
                <div className="text-2xl font-bold text-primary mt-1">
                  {Array.from(assignedLoads.values()).flat().length}
                </div>
                <div className="text-xs text-muted-foreground">loads</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold uppercase text-muted-foreground">Revenue</div>
                <div className="text-xl font-bold mt-1">
                  R{Array.from(assignedLoads.values()).flat().reduce((sum, l) => sum + Number(l.rate), 0).toLocaleString()}
                </div>
              </div>
            </div>
          </div>
        </div>
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
        const dayOfWeek = getDay(day)
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
        const dayLabel = viewMode === "month" ? format(day, 'EEE') : DAY_LABELS[dayIndex]

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
              <div className="text-xs font-semibold">{dayLabel}</div>
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
        viewMode={viewMode}
      />
    </div>
  )
})
