"use client"

import React, { useMemo } from "react"
import { useDroppable } from "@dnd-kit/core"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, PanelLeftClose, PanelLeft, Package } from "lucide-react"
import { LoadCard } from "./load-card"
import type { PlanningLoad } from "@/types/planning"

interface UnassignedLoadsPanelProps {
  loads: PlanningLoad[]
  searchTerm: string
  onSearchTermChange: (v: string) => void
  clientFilter: string
  materialFilter: string
  isCollapsed: boolean
  onToggleCollapse: () => void
  onLoadClick: (load: PlanningLoad) => void
}

export const UnassignedLoadsPanel = React.memo(function UnassignedLoadsPanel({
  loads,
  searchTerm,
  onSearchTermChange,
  clientFilter,
  materialFilter,
  isCollapsed,
  onToggleCollapse,
  onLoadClick,
}: UnassignedLoadsPanelProps) {
  const { isOver, setNodeRef } = useDroppable({ id: "unassigned" })

  const filteredLoads = useMemo(() => {
    return loads.filter((load) => {
      const matchesSearch =
        !searchTerm ||
        load.load_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        load.destination.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesClient = !clientFilter || clientFilter === "all" || load.client === clientFilter
      const matchesMaterial = !materialFilter || materialFilter === "all" || load.material === materialFilter
      return matchesSearch && matchesClient && matchesMaterial
    })
  }, [loads, searchTerm, clientFilter, materialFilter])

  if (isCollapsed) {
    return (
      <div className="w-10 shrink-0 border-r border-border bg-card flex flex-col items-center py-3 gap-2">
        <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="p-1">
          <PanelLeft className="h-4 w-4" />
        </Button>
        <Badge variant="secondary" className="text-[10px] px-1">
          {loads.length}
        </Badge>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        w-[280px] shrink-0 border-r border-border bg-card flex flex-col
        transition-colors duration-150
        ${isOver ? 'bg-primary/5 border-primary' : ''}
      `}
    >
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Unassigned</span>
            <Badge variant="secondary" className="text-xs">
              {filteredLoads.length}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onToggleCollapse} className="p-1">
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search loads..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Load list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filteredLoads.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs py-8">
            {loads.length === 0
              ? "No unassigned loads for this week"
              : "No loads match your search"}
          </div>
        ) : (
          filteredLoads.map((load) => (
            <LoadCard
              key={load.id}
              load={load}
              onClick={() => onLoadClick(load)}
            />
          ))
        )}
      </div>
    </div>
  )
})
