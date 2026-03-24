import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoadBooking } from "@/components/load-booking"
import { GoogleMapsProvider } from "@/components/ui/address-input"

export default async function AdminLoadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <GoogleMapsProvider>
      <LoadBooking />
    </GoogleMapsProvider>
  )
}
