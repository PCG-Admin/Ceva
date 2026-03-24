import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuditLogView } from "@/components/audit-log"

export default async function AdminAuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <AuditLogView />
}
