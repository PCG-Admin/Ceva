"use client"

/**
 * CEVA Citrus TMS - Milestone Timeline Component
 * Visual timeline showing load progress through 6 checkpoints
 * Color coding per SOW: yellow (pending), green (completed), blue (delivered)
 */

import { format } from 'date-fns'
import { CheckCircle, Circle, Truck } from 'lucide-react'
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

interface CitrusMilestoneTimelineProps {
  milestoneData: CitrusLoadMilestones
  loadNumber?: string
  showProgress?: boolean
  compact?: boolean
}

export function CitrusMilestoneTimeline({
  milestoneData,
  loadNumber,
  showProgress = true,
  compact = false,
}: CitrusMilestoneTimelineProps) {
  const milestones = buildMilestonesFromLoad(milestoneData)
  const progress = calculateLoadProgress(milestones)

  if (compact) {
    return <CompactTimeline milestones={milestones} progress={progress} />
  }

  return (
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
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function MilestoneItem({ milestone, isLast }: { milestone: CitrusMilestone; isLast: boolean }) {
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
          {milestone.completedAt && (
            <Badge variant="outline" className="ml-4">
              {format(milestone.completedAt, 'dd MMM yyyy HH:mm')}
            </Badge>
          )}
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
              title={`${milestone.name}${milestone.completedAt ? ` - ${format(milestone.completedAt, 'dd MMM HH:mm')}` : ''}`}
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
