import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClientPortalContent } from '@/components/client-portal-content'

export default async function ClientPortalPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user is a client
  const { data: profile } = await supabase
    .from('ceva_profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'client') {
    redirect('/')
  }

  // Fetch client details
  const { data: clientDetails } = await supabase
    .from('ceva_clients')
    .select('*')
    .eq('id', user.id)
    .single()

  return <ClientPortalContent user={user} profile={profile} clientDetails={clientDetails} />
}
