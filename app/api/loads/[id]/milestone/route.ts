import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const VALID_MILESTONE_FIELDS = [
  "date_loaded",
  "date_arrived_border_sa",
  "date_johannesburg",
  "date_harrismith",
  "date_durban_arrival",
  "date_offloaded",
] as const

const MILESTONE_NAMES: Record<string, string> = {
  date_loaded:            "Loaded at Farm",
  date_arrived_border_sa: "Bitebridge (BBR Border)",
  date_johannesburg:      "Johannesburg",
  date_harrismith:        "Harrismith",
  date_durban_arrival:    "Durban Arrival",
  date_offloaded:         "Delivered — Bayhead",
}

type MilestoneField = (typeof VALID_MILESTONE_FIELDS)[number]

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: loadId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 })
  }

  let body: { field: string; date: string | null; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const { field, date, note } = body

  if (!VALID_MILESTONE_FIELDS.includes(field as MilestoneField)) {
    return NextResponse.json({ error: "Invalid milestone field" }, { status: 400 })
  }

  // Validate date format (YYYY-MM-DD) if provided
  if (date !== null && date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "Date must be YYYY-MM-DD" }, { status: 400 })
    }
  }

  // Fetch current value for audit record
  const { data: current, error: fetchErr } = await supabase
    .from("ceva_loads")
    .select(field)
    .eq("id", loadId)
    .single()

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Load not found" }, { status: 404 })
  }

  const previousValue = (current as Record<string, string | null>)[field] ?? null

  // Update the milestone date on the load
  const { error: updateErr } = await supabase
    .from("ceva_loads")
    .update({ [field]: date ?? null })
    .eq("id", loadId)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Write audit record
  await supabase.from("ceva_load_milestone_audit").insert({
    load_id:            loadId,
    milestone_field:    field,
    milestone_name:     MILESTONE_NAMES[field],
    previous_value:     previousValue,
    new_value:          date ?? null,
    note:               note ?? null,
    updated_by_user_id: user.id,
    updated_by_email:   user.email,
  })

  return NextResponse.json({ success: true })
}
