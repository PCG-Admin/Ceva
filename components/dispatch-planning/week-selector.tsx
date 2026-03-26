"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { format, addWeeks, subWeeks, startOfWeek, addDays, isSameWeek, addMonths, subMonths, startOfMonth } from "date-fns"

interface WeekSelectorProps {
  currentWeekStart: Date
  onWeekChange: (newWeekStart: Date) => void
  viewMode?: "week" | "month"
  onViewModeChange?: (mode: "week" | "month") => void
}

export function WeekSelector({ currentWeekStart, onWeekChange, viewMode = "week", onViewModeChange }: WeekSelectorProps) {
  const weekEnd = addDays(currentWeekStart, 6)
  const isCurrentWeek = isSameWeek(currentWeekStart, new Date(), { weekStartsOn: 1 })

  const handlePrevious = () => {
    if (viewMode === "month") {
      onWeekChange(startOfWeek(subMonths(currentWeekStart, 1), { weekStartsOn: 1 }))
    } else {
      onWeekChange(subWeeks(currentWeekStart, 1))
    }
  }

  const handleNext = () => {
    if (viewMode === "month") {
      onWeekChange(startOfWeek(addMonths(currentWeekStart, 1), { weekStartsOn: 1 }))
    } else {
      onWeekChange(addWeeks(currentWeekStart, 1))
    }
  }

  const handleToday = () => {
    onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="text-sm font-medium min-w-[200px] text-center">
        {viewMode === "month"
          ? format(currentWeekStart, 'MMMM yyyy')
          : `${format(currentWeekStart, 'dd MMM')} – ${format(weekEnd, 'dd MMM yyyy')}`
        }
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentWeek && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToday}
        >
          <CalendarDays className="h-4 w-4 mr-1" />
          Today
        </Button>
      )}

      {onViewModeChange && (
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("week")}
          >
            Week
          </Button>
          <Button
            variant={viewMode === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("month")}
          >
            Month
          </Button>
        </div>
      )}
    </div>
  )
}
