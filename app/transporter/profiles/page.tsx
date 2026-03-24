import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TransporterManagement } from "@/components/transporter-management"

export default async function TransporterProfilesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <TransporterManagement />
}
