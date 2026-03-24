import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VehicleTracking } from "@/components/vehicle-tracking"
import { GoogleMapsProvider } from "@/components/ui/address-input/google-maps-provider"

export default async function TransporterTrucksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <GoogleMapsProvider>
      <VehicleTracking />
    </GoogleMapsProvider>
  )
}
