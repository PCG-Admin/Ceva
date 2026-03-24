import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InvoicingPayments } from "@/components/invoicing-payments"

export default async function AdminInvoicingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <InvoicingPayments />
}
