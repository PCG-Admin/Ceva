"use client"

import React, { useMemo } from "react"
import { format, addDays } from "date-fns"
import type { PlanningLoad, PlanningHorse, GridCellKey } from "@/types/planning"

interface WeeklySummaryProps {
  horses: PlanningHorse[]
  assignedLoads: Map<GridCellKey, PlanningLoad[]>
  weekStart: Date
  gridCols: string
}

export const WeeklySummary = React.memo(function WeeklySummary({
  horses,
  assignedLoads,
  weekStart,
  gridCols,
}: WeeklySummaryProps) {
  const summaries = useMemo(() => {
    let grandTotalLoads = 0
    let grandTotalRevenue = 0

    const perVehicle = horses.map((horse) => {
      let loadCount = 0
      let revenue = 0

      for (let i = 0; i < 7; i++) {
        const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd')
        const cellKey = `${horse.id}:${dateStr}` as GridCellKey
        const cellLoads = assignedLoads.get(cellKey) || []
        loadCount += cellLoads.length
        revenue += cellLoads.reduce((sum, l) => sum + Number(l.rate), 0)
      }

      grandTotalLoads += loadCount
      grandTotalRevenue += revenue

      return { id: horse.id, loadCount, revenue }
    })

    return { perVehicle, grandTotalLoads, grandTotalRevenue }
  }, [horses, assignedLoads, weekStart])

  return (
    <div
      className="grid sticky bottom-0 z-10 bg-card border-t-2 border-primary/20"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="sticky left-0 z-20 bg-card border-r border-border p-2">
        <div className="text-xs font-bold">Totals</div>
        <div className="text-[10px] text-muted-foreground mt-1">
          {summaries.grandTotalLoads} loads
        </div>
        <div className="text-[10px] font-semibold text-primary">
          R{summaries.grandTotalRevenue.toLocaleString()}
        </div>
      </div>
      {summaries.perVehicle.map((vs) => (
        <div
          key={vs.id}
          className="border-r border-border p-2"
        >
          <div className="text-xs text-muted-foreground">
            {vs.loadCount} {vs.loadCount === 1 ? 'load' : 'loads'}
          </div>
          <div className="text-xs font-semibold">
            R{vs.revenue.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
})
