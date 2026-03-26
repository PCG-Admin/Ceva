"use client"

import React, { useMemo } from "react"
import { format, addDays, getDaysInMonth, startOfMonth } from "date-fns"
import type { PlanningLoad, PlanningHorse, GridCellKey } from "@/types/planning"

interface WeeklySummaryProps {
  horses: PlanningHorse[]
  assignedLoads: Map<GridCellKey, PlanningLoad[]>
  weekStart: Date
  gridCols: string
  viewMode?: "week" | "month"
}

export const WeeklySummary = React.memo(function WeeklySummary({
  horses,
  assignedLoads,
  weekStart,
  gridCols,
  viewMode = "week",
}: WeeklySummaryProps) {
  const summaries = useMemo(() => {
    let grandTotalLoads = 0
    let grandTotalRevenue = 0

    const perVehicle = horses.map((horse) => {
      let loadCount = 0
      let revenue = 0

      const numDays = viewMode === "month" ? getDaysInMonth(startOfMonth(weekStart)) : 7

      for (let i = 0; i < numDays; i++) {
        const dateStr = format(addDays(viewMode === "month" ? startOfMonth(weekStart) : weekStart, i), 'yyyy-MM-dd')
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
  }, [horses, assignedLoads, weekStart, viewMode])

  return (
    <div
      className="grid sticky bottom-0 z-10 bg-muted/50 border-t-2 border-primary shadow-lg"
      style={{ gridTemplateColumns: gridCols }}
    >
      <div className="sticky left-0 z-20 bg-primary text-primary-foreground border-r border-border p-3">
        <div className="text-xs font-bold uppercase">Total</div>
        <div className="text-lg font-bold mt-1">
          {summaries.grandTotalLoads}
        </div>
        <div className="text-[10px] opacity-90">
          loads
        </div>
        <div className="text-sm font-semibold mt-1">
          R{summaries.grandTotalRevenue.toLocaleString()}
        </div>
      </div>
      {summaries.perVehicle.map((vs) => (
        <div
          key={vs.id}
          className="border-r border-border p-3 bg-card"
        >
          <div className="text-sm font-bold text-primary">
            {vs.loadCount}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {vs.loadCount === 1 ? 'load' : 'loads'}
          </div>
          <div className="text-xs font-semibold mt-1">
            R{vs.revenue.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  )
})
