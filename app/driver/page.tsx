import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DriverPortalContent } from '@/components/driver-portal-content'

export default async function DriverPortalPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify user is a driver
  const { data: profile } = await supabase
    .from('ceva_profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'driver') {
    redirect('/')
  }

  // Fetch driver details
  const { data: driverDetails } = await supabase
    .from('ceva_drivers')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!driverDetails) {
    // Driver profile doesn't exist yet - this shouldn't happen but handle gracefully
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Driver Profile Not Found</h1>
          <p className="text-muted-foreground">
            Your driver profile is being set up. Please contact your administrator.
          </p>
        </div>
      </div>
    )
  }

  return <DriverPortalContent user={user} profile={profile} driverDetails={driverDetails} />
}
