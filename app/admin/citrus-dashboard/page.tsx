/**
 * CEVA Citrus Tracking Dashboard
 * SOW Section 3.1.3 - Client Dashboard
 * Live tracking screen for displaying at client premises
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CitrusDashboardClient } from '@/components/citrus-dashboard-client'

export const metadata = {
  title: 'Citrus Transport Tracking | CEVA Logistics',
  description: 'Live citrus load tracking dashboard - 2026 Season',
}

export default async function CitrusDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CitrusDashboardClient />
}
