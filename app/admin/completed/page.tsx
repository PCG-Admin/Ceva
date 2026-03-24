import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CompletedOrders } from "@/components/completed-orders"

export default async function AdminCompletedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CompletedOrders />
}
