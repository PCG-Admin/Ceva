import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("ceva_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  if (id === user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 400 }
    )
  }

  const adminSupabase = createAdminClient()

  // Nullify foreign key references that would block deletion
  await Promise.all([
    adminSupabase.from("ceva_transporters").update({ created_by: null }).eq("created_by", id),
    adminSupabase.from("ceva_contracts").update({ created_by: null }).eq("created_by", id),
    adminSupabase.from("ceva_transporter_documents").update({ verified_by: null }).eq("verified_by", id),
    adminSupabase.from("ceva_driver_documents").update({ verified_by: null }).eq("verified_by", id),
  ])

  const { error } = await adminSupabase.auth.admin.deleteUser(id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from("ceva_profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { full_name, phone, role, password } = body

  // Update profile fields
  const profileUpdate: Record<string, string | null> = {}
  if (full_name !== undefined) profileUpdate.full_name = full_name
  if (phone !== undefined) profileUpdate.phone = phone || null
  if (role !== undefined) profileUpdate.role = role

  if (Object.keys(profileUpdate).length > 0) {
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from("ceva_profiles")
      .update(profileUpdate)
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  // Update password if provided
  if (password) {
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.auth.admin.updateUserById(id, {
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
  }

  return NextResponse.json({ success: true })
}
