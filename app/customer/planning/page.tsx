import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DispatchPlanning } from "@/components/dispatch-planning"

export default async function DispatchPlanningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <DispatchPlanning />
}
