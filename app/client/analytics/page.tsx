/**
 * CEVA Client Portal - Analytics
 * Analytics view for client users showing load performance and statistics
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClientAnalytics } from '@/components/client-analytics'

export const metadata = {
  title: 'Analytics | Client Portal',
  description: 'Analytics and insights for your loads',
}

export default async function ClientAnalyticsPage() {
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

  return <ClientAnalytics />
}
