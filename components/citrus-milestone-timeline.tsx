"use client"

/**
 * CEVA Citrus TMS - Milestone Timeline Component
 * Visual timeline showing load progress through 6 checkpoints
 * Color coding per SOW: yellow (pending), green (completed), blue (delivered)
 *
 * CE2-T43: Supports manual milestone updates via editable prop
 * CE2-T44: Colour-coded status indicators (yellow/green/blue)
 */

import { useState } from 'react'
import { format } from 'date-fns'
import { CheckCircle, Circle, Truck, Pencil, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  type CitrusMilestone,
  type CitrusLoadMilestones,
  buildMilestonesFromLoad,
  getMilestoneColor,
  getMilestoneTextColor,
  calculateLoadProgress,
} from '@/types/citrus-milestones'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface CitrusMilestoneTimelineProps {
  milestoneData: CitrusLoadMilestones
  loadNumber?: string
  showProgress?: boolean
  compact?: boolean
  /** Enable manual milestone updates (CE2-T43) */
  editable?: boolean
  /** Required when editable=true */
  loadId?: string
  /** Called after a successful update so the parent can refresh its data */
  onMilestoneUpdated?: (field: keyof CitrusLoadMilestones, newDate: string | null) => void
}

export function CitrusMilestoneTimeline({
  milestoneData,
  loadNumber,
  showProgress = true,
  compact = false,
  editable = false,
  loadId,
  onMilestoneUpdated,
}: CitrusMilestoneTimelineProps) {
  const milestones = buildMilestonesFromLoad(milestoneData)
  const progress = calculateLoadProgress(milestones)

  const [editingMilestone, setEditingMilestone] = useState<CitrusMilestone | null>(null)
  const [editDate, setEditDate] = useState<string>("")
  const [editNote, setEditNote] = useState<string>("")
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function openDialog(milestone: CitrusMilestone) {
    // Default to today in YYYY-MM-DD
    const today = new Date().toISOString().split("T")[0]
    setEditDate(milestone.completedAt ? format(milestone.completedAt, "yyyy-MM-dd") : today)
    setEditNote("")
    setSaveError(null)
    setEditingMilestone(milestone)
  }

  function closeDialog() {
    if (!saving) setEditingMilestone(null)
  }

  async function handleSave() {
    if (!editingMilestone || !loadId) return
    setSaving(true)
    setSaveError(null)

    try {
      const res = await fetch(`/api/loads/${loadId}/milestone`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: editingMilestone.dateField,
          date: editDate || null,
          note: editNote || undefined,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setSaveError(body.error ?? "Failed to save")
        return
      }

      onMilestoneUpdated?.(editingMilestone.dateField, editDate || null)
      setEditingMilestone(null)
    } catch {
      setSaveError("Network error — please try again")
    } finally {
      setSaving(false)
    }
  }

  if (compact) {
    return <CompactTimeline milestones={milestones} progress={progress} />
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Load Tracking {loadNumber && `- ${loadNumber}`}
              </CardTitle>
              <CardDescription>
                Citrus Transport: Nottingham/Bitebridge → K-Hold, Bayhead, Durban
              </CardDescription>
            </div>
            {showProgress && (
              <Badge variant={progress === 100 ? 'default' : 'secondary'} className="text-lg px-4 py-2">
                {progress}% Complete
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showProgress && (
            <Progress value={progress} className="mb-6" />
          )}
          <div className="space-y-4">
            {milestones.map((milestone, index) => (
              <MilestoneItem
                key={milestone.id}
                milestone={milestone}
                isLast={index === milestones.length - 1}
                editable={editable && !!loadId}
                onEdit={() => openDialog(milestone)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manual update dialog (CE2-T43) */}
      <Dialog open={!!editingMilestone} onOpenChange={(open) => { if (!open) closeDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingMilestone?.completedAt ? "Edit milestone date" : "Mark milestone reached"}
            </DialogTitle>
            <DialogDescription>
              {editingMilestone?.name} — {editingMilestone?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="milestone-date">Date reached</Label>
              <Input
                id="milestone-date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="milestone-note">Note <span className="text-muted-foreground">(optional)</span></Label>
              <Input
                id="milestone-note"
                type="text"
                placeholder="e.g. Confirmed by driver via WhatsApp"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={closeDialog} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !editDate}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function MilestoneItem({
  milestone,
  isLast,
  editable,
  onEdit,
}: {
  milestone: CitrusMilestone
  isLast: boolean
  editable?: boolean
  onEdit?: () => void
}) {
  const isPending = milestone.status === 'pending'
  const colorClass = getMilestoneColor(milestone.status)
  const textColorClass = getMilestoneTextColor(milestone.status)

  return (
    <div className="flex gap-4">
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full border-2',
            isPending ? 'border-gray-300 bg-gray-100' : `border-transparent ${colorClass}`
          )}
        >
          {isPending ? (
            <Circle className="h-5 w-5 text-gray-400" />
          ) : (
            <CheckCircle className="h-5 w-5 text-white" />
          )}
        </div>
        {!isLast && (
          <div
            className={cn(
              'h-12 w-0.5',
              isPending ? 'bg-gray-200' : 'bg-gray-300'
            )}
          />
        )}
      </div>

      {/* Milestone content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className={cn('font-semibold', textColorClass)}>
              {milestone.name}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              {milestone.description}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            {milestone.completedAt && (
              <Badge variant="outline">
                {format(milestone.completedAt, 'dd MMM yyyy')}
              </Badge>
            )}
            {editable && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title={isPending ? "Mark as reached" : "Edit date"}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CompactTimeline({ milestones, progress }: { milestones: CitrusMilestone[]; progress: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Progress</span>
        <span className="font-semibold">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="flex justify-between pt-2">
        {milestones.map((milestone) => {
          const colorClass = getMilestoneColor(milestone.status)
          const isPending = milestone.status === 'pending'

          return (
            <div
              key={milestone.id}
              className="flex flex-col items-center gap-1"
              title={`${milestone.name}${milestone.completedAt ? ` - ${format(milestone.completedAt, 'dd MMM yyyy')}` : ''}`}
            >
              <div
                className={cn(
                  'h-3 w-3 rounded-full border-2',
                  isPending ? 'border-gray-300 bg-gray-100' : `border-transparent ${colorClass}`
                )}
              />
              <span className="text-[10px] text-muted-foreground text-center max-w-[60px] leading-tight">
                {milestone.name.split(' ')[0]}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * For display on client's on-premises screen (SOW 3.1.3)
 * Full-screen dashboard view
 */
interface FullScreenDashboardProps {
  loads: Array<{
    load_number: string
    client: string
    origin: string
    destination: string
    milestones: CitrusLoadMilestones
  }>
}

export function CitrusFullScreenDashboard({ loads }: FullScreenDashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">CEVA Logistics - Citrus Transport Tracking</h1>
          <p className="text-xl text-muted-foreground">
            Live Load Status - Season 2026
          </p>
        </div>

        <div className="grid gap-6">
          {loads.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No active loads</p>
              </CardContent>
            </Card>
          ) : (
            loads.map((load) => (
              <Card key={load.load_number} className="shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl">{load.load_number}</CardTitle>
                      <CardDescription className="text-base mt-1">
                        {load.client} | {load.origin} → {load.destination}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CitrusMilestoneTimeline
                    milestoneData={load.milestones}
                    showProgress={true}
                    compact={false}
                  />
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Auto-refreshes every 30 seconds | Last updated: {format(new Date(), 'dd MMM yyyy HH:mm:ss')}
        </div>
      </div>
    </div>
  )
}
