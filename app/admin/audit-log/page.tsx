import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuditLogView } from "@/components/audit-log"

export default async function AdminAuditLogPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from("ceva_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    redirect('/admin')
  }

  return <AuditLogView />
}
