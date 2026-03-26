import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT use getSession() - it doesn't revalidate tokens
  // Use getUser() which makes a request to Supabase Auth server
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Define public routes that don't require authentication
  const isPublicRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/signup') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/api/ctrack/record-positions')

  // Redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Preserve the intended destination
    url.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages
  if (user && (request.nextUrl.pathname.startsWith('/login') ||
               request.nextUrl.pathname.startsWith('/signup'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Role-based access control
  if (user) {
    const { data: profile } = await supabase
      .from('ceva_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const userRole = profile?.role

    // Define protected routes by role
    const isAdminRoute = request.nextUrl.pathname.startsWith('/admin')
    const isTransporterRoute = request.nextUrl.pathname.startsWith('/transporter')
    const isCustomerRoute = request.nextUrl.pathname.startsWith('/customer')
    const isClientRoute = request.nextUrl.pathname.startsWith('/client')
    const isDriverRoute = request.nextUrl.pathname.startsWith('/driver')

    // Redirect clients to admin dashboard (they see filtered data via RLS)
    if (userRole === 'client') {
      // Allow clients to access /admin routes (RLS filters their data)
      // Just redirect from home to citrus dashboard
      if (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/client') {
        const url = request.nextUrl.clone()
        url.pathname = '/admin/citrus-dashboard'
        return NextResponse.redirect(url)
      }
    }

    // Redirect drivers to their portal if they try to access other areas
    if (userRole === 'driver') {
      if (!isDriverRoute && request.nextUrl.pathname !== '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/driver'
        return NextResponse.redirect(url)
      }
      // Redirect from home to driver portal
      if (request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/driver'
        return NextResponse.redirect(url)
      }
    }

    // Allow admin, dispatcher, and client to access admin routes
    // (RLS will filter data appropriately)
    if (isAdminRoute && !['admin', 'dispatcher', 'client'].includes(userRole || '')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Redirect non-drivers away from driver portal
    if (isDriverRoute && userRole !== 'driver') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
