/**
 * CEVA Citrus TMS - Milestone Tracking Types
 * Based on SOW Section 3.1.2
 *
 * Route: Nottingham/Bitebridge (KZN) → K-Hold, Bayhead, Durban
 */

export type MilestoneStatus = 'pending' | 'completed' | 'delivered'

export interface CitrusMilestone {
  id: number
  name: string
  description: string
  dateField: keyof CitrusLoadMilestones
  status: MilestoneStatus
  completedAt: Date | null
}

export interface CitrusLoadMilestones {
  date_loaded: Date | null                // Milestone 1: Loaded at Farm
  date_arrived_border_sa: Date | null     // Milestone 2: Bitebridge (BBR Border)
  date_johannesburg: Date | null          // Milestone 3: Johannesburg
  date_harrismith: Date | null            // Milestone 4: Harrismith
  date_durban_arrival: Date | null        // Milestone 5: Durban Arrival
  date_offloaded: Date | null             // Milestone 6: Delivered —Bayhead
}

/**
 * SOW Section 3.1.2 - Milestone definitions for citrus route
 */
export const CITRUS_MILESTONES: Readonly<Omit<CitrusMilestone, 'status' | 'completedAt'>[]> = [
  {
    id: 1,
    name: 'Loaded at Farm',
    description: 'Truck confirmed loaded and departed Nottingham / Bitebridge',
    dateField: 'date_loaded',
  },
  {
    id: 2,
    name: 'Bitebridge (BBR Border)',
    description: 'Load has cleared or passed through the BBR checkpoint',
    dateField: 'date_arrived_border_sa',
  },
  {
    id: 3,
    name: 'Johannesburg',
    description: 'Load confirmed passing through or staging in Joburg',
    dateField: 'date_johannesburg',
  },
  {
    id: 4,
    name: 'Harrismith',
    description: 'Load has passed through Harrismith on the N3',
    dateField: 'date_harrismith',
  },
  {
    id: 5,
    name: 'Durban Arrival',
    description: 'Load has arrived in Durban metro area',
    dateField: 'date_durban_arrival',
  },
  {
    id: 6,
    name: 'Delivered —Bayhead',
    description: 'Load confirmed offloaded at the cold store destination',
    dateField: 'date_offloaded',
  },
] as const

/**
 * Get milestone status based on completion date
 * Color coding per SOW: yellow (pending), green (completed), blue (delivered)
 */
export function getMilestoneStatus(
  completedAt: Date | null,
  isLastMilestone: boolean
): MilestoneStatus {
  if (!completedAt) return 'pending'
  if (isLastMilestone) return 'delivered'
  return 'completed'
}

/**
 * Get color for milestone status
 * SOW: yellow (pending), green (passed/complete), blue (offloaded/delivered)
 */
export function getMilestoneColor(status: MilestoneStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-yellow-500'
    case 'completed':
      return 'bg-green-500'
    case 'delivered':
      return 'bg-blue-500'
  }
}

/**
 * Get milestone status text color
 */
export function getMilestoneTextColor(status: MilestoneStatus): string {
  switch (status) {
    case 'pending':
      return 'text-yellow-700 dark:text-yellow-400'
    case 'completed':
      return 'text-green-700 dark:text-green-400'
    case 'delivered':
      return 'text-blue-700 dark:text-blue-400'
  }
}

/**
 * Build milestone array with status from load data
 */
export function buildMilestonesFromLoad(milestoneData: CitrusLoadMilestones): CitrusMilestone[] {
  return CITRUS_MILESTONES.map((milestone, index) => {
    const dateValue = milestoneData[milestone.dateField]
    const completedAt = dateValue ? new Date(dateValue) : null
    const isLastMilestone = index === CITRUS_MILESTONES.length - 1

    return {
      ...milestone,
      status: getMilestoneStatus(completedAt, isLastMilestone),
      completedAt,
    }
  })
}

/**
 * Calculate overall load progress percentage
 */
export function calculateLoadProgress(milestones: CitrusMilestone[]): number {
  const completed = milestones.filter(m => m.status !== 'pending').length
  return Math.round((completed / milestones.length) * 100)
}
