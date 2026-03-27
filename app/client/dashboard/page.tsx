/**
 * CEVA Client Portal - Citrus Tracking Dashboard
 * SOW Section 3.1.3 - Client-facing dashboard
 *
 * This page shows clients their citrus loads with live tracking.
 * Data is filtered by RLS policies to show only their loads.
 *
 * Access: client@ceva.co.za / CevaCitrus2026!
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CitrusDashboardClient } from '@/components/citrus-dashboard-client'

export const metadata = {
  title: 'Client Dashboard | CEVA Logistics',
  description: 'Live citrus load tracking dashboard for CEVA Logistics clients',
}

export default async function ClientDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user role
  const { data: profile } = await supabase
    .from('ceva_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Only allow client role
  if (!profile || profile.role !== 'client') {
    redirect('/login')
  }

  return <CitrusDashboardClient isClientView={true} />
}
