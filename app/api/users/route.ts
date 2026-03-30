import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { withSecurity } from "@/lib/security/middleware"
import { validateAndSanitize, createUserSchema } from "@/lib/security/validation"
import { logUserEvent, logApiViolation } from "@/lib/security/audit-log"

async function handler(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    await logApiViolation(
      "api.unauthorized_access",
      request,
      "/api/users"
    )
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("ceva_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    await logApiViolation(
      "api.forbidden_access",
      request,
      "/api/users",
      user.id
    )
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()

  // Validate and sanitize input
  const validation = validateAndSanitize(body, createUserSchema)

  if (!validation.success) {
    console.error('User creation validation failed:', validation.error)
    console.error('Request body:', JSON.stringify(body, null, 2))
    return NextResponse.json(
      { error: validation.error },
      { status: 400 }
    )
  }

  const { email, password, full_name, phone, role } = validation.data

  const adminSupabase = createAdminClient()
  const { data, error } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name,
      role: role || "admin",
      phone: phone || null,
    },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Log user creation event
  await logUserEvent(
    "user.create",
    user.id,
    data.user.id,
    request,
    {
      email,
      role: role || "admin",
    }
  )

  return NextResponse.json({ id: data.user.id })
}

// Apply security middleware with rate limiting
export const POST = withSecurity(handler, {
  rateLimit: {
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 5, // Max 5 user creations per minute
  },
  maxRequestSizeKB: 10, // 10KB max request size
})
