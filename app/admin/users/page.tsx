import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { UserManagement } from "@/components/user-management"

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <UserManagement />
}
