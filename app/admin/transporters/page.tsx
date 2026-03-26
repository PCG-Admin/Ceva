import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransporterManagement } from "@/components/transporter-management"

export default async function AdminTransportersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user is admin or dispatcher
  const { data: profile } = await supabase
    .from('ceva_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'dispatcher'].includes(profile.role)) {
    redirect('/login')
  }

  return <TransporterManagement />
}
