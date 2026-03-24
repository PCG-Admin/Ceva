"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { format, addWeeks, subWeeks, startOfWeek, addDays, isSameWeek } from "date-fns"

interface WeekSelectorProps {
  currentWeekStart: Date
  onWeekChange: (newWeekStart: Date) => void
}

export function WeekSelector({ currentWeekStart, onWeekChange }: WeekSelectorProps) {
  const weekEnd = addDays(currentWeekStart, 6)
  const isCurrentWeek = isSameWeek(currentWeekStart, new Date(), { weekStartsOn: 1 })

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onWeekChange(subWeeks(currentWeekStart, 1))}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="text-sm font-medium min-w-[200px] text-center">
        {format(currentWeekStart, 'dd MMM')} – {format(weekEnd, 'dd MMM yyyy')}
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onWeekChange(addWeeks(currentWeekStart, 1))}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {!isCurrentWeek && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onWeekChange(startOfWeek(new Date(), { weekStartsOn: 1 }))}
        >
          <CalendarDays className="h-4 w-4 mr-1" />
          Today
        </Button>
      )}
    </div>
  )
}
