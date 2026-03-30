import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Session timeout configuration (in milliseconds)
const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const SESSION_ABSOLUTE_TIMEOUT = 12 * 60 * 60 * 1000 // 12 hours

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

  // Session timeout management
  const lastActivity = request.cookies.get('last_activity')?.value
  const sessionStart = request.cookies.get('session_start')?.value
  const now = Date.now()

  if (lastActivity) {
    const timeSinceActivity = now - parseInt(lastActivity)

    // Check for idle timeout
    if (timeSinceActivity > SESSION_TIMEOUT) {
      // Session expired due to inactivity
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('session', 'expired')
      const response = NextResponse.redirect(url)

      // Clear session cookies
      response.cookies.delete('last_activity')
      response.cookies.delete('session_start')

      return response
    }
  }

  if (sessionStart) {
    const sessionDuration = now - parseInt(sessionStart)

    // Check for absolute timeout
    if (sessionDuration > SESSION_ABSOLUTE_TIMEOUT) {
      // Session expired due to absolute timeout
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('session', 'expired')
      const response = NextResponse.redirect(url)

      // Clear session cookies
      response.cookies.delete('last_activity')
      response.cookies.delete('session_start')

      return response
    }
  }

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
    const isReportsRoute = request.nextUrl.pathname.startsWith('/reports')
    const isTransporterRoute = request.nextUrl.pathname.startsWith('/transporter')
    const isCustomerRoute = request.nextUrl.pathname.startsWith('/customer')
    const isClientRoute = request.nextUrl.pathname.startsWith('/client')
    const isDriverRoute = request.nextUrl.pathname.startsWith('/driver')

    // Redirect clients to their client portal
    if (userRole === 'client') {
      // Redirect from home to client dashboard
      if (request.nextUrl.pathname === '/') {
        const url = request.nextUrl.clone()
        url.pathname = '/client/dashboard'
        return NextResponse.redirect(url)
      }
      // Prevent clients from accessing any routes except /client
      if (isAdminRoute || isReportsRoute || isCustomerRoute || isTransporterRoute || isDriverRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/client/dashboard'
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

    // Allow admin and dispatcher to access admin routes
    if (isAdminRoute && !['admin', 'dispatcher'].includes(userRole || '')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Protect reports routes - only admin and dispatcher
    if (isReportsRoute && !['admin', 'dispatcher'].includes(userRole || '')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Protect customer routes - only admin and dispatcher
    if (isCustomerRoute && !['admin', 'dispatcher'].includes(userRole || '')) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Protect transporter routes - only admin and dispatcher
    if (isTransporterRoute && !['admin', 'dispatcher'].includes(userRole || '')) {
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

    // Redirect non-clients away from client portal
    if (isClientRoute && userRole !== 'client') {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }

    // Update session activity timestamps
    supabaseResponse.cookies.set('last_activity', now.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_ABSOLUTE_TIMEOUT / 1000,
    })

    // Set session start if not exists
    if (!sessionStart) {
      supabaseResponse.cookies.set('session_start', now.toString(), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_ABSOLUTE_TIMEOUT / 1000,
      })
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
