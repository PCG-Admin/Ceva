import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContractsManagement } from "@/components/contracts-management"

export default async function ContractsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <ContractsManagement />
}
