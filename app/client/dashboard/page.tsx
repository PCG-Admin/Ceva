/**
 * CEVA Client Portal - Citrus Tracking Dashboard
 * SOW Section 3.1.3 - Client-facing dashboard
 *
 * This page is designed to be displayed on a screen at the client's premises
 * for continuous visibility of citrus load tracking.
 *
 * Access: client@ceva.co.za / CevaCitrus2026!
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CitrusDashboardClient } from '@/components/citrus-dashboard-client'

export const metadata = {
  title: 'CEVA Client Portal - Citrus Tracking',
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

  // Allow client, dispatcher, and admin roles
  if (!profile || !['client', 'dispatcher', 'admin'].includes(profile.role)) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background">
      <CitrusDashboardClient isClientView={true} />
    </div>
  )
}
