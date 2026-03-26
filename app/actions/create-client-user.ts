"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"

/**
 * Creates a client user with automatic auth account creation
 * This is called when a client is created in the portal
 */
export async function createClientWithUser(data: {
  name: string
  email: string
  contact_number?: string
  pickup_addresses?: any[]
  delivery_addresses?: any[]
  notes?: string
}) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  // Validate email is provided
  if (!data.email) {
    return {
      success: false,
      error: "Email is required for client portal access",
    }
  }

  try {
    // Step 1: Create the client record
    const { data: clientData, error: clientError } = await supabase
      .from("ceva_clients")
      .insert({
        name: data.name,
        email: data.email,
        contact_number: data.contact_number || null,
        pickup_addresses: data.pickup_addresses || [],
        delivery_addresses: data.delivery_addresses || [],
        notes: data.notes || null,
      })
      .select()
      .single()

    if (clientError) {
      console.error("Error creating client:", clientError)
      return {
        success: false,
        error: `Failed to create client: ${clientError.message}`,
      }
    }

    // Step 2: Create auth user with Supabase Admin API
    console.log("Creating auth user for:", data.email)
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: "CevaCitrus2026!", // Default password
      email_confirm: true, // Auto-confirm the email
      user_metadata: {
        full_name: data.name,
        role: "client",
      },
    })

    if (authError) {
      console.error("Error creating auth user:", authError)
      console.error("Full error details:", JSON.stringify(authError, null, 2))
      // Don't fail completely - client record exists, admin can create user manually
      return {
        success: true,
        warning: `Client created but login not enabled: ${authError.message || JSON.stringify(authError)}. Please create auth user manually.`,
        client: clientData,
      }
    }

    console.log("Auth user created successfully:", authUser.user.id)

    // Step 3: Link the client to the auth user
    const { error: linkError } = await supabase
      .from("ceva_clients")
      .update({ user_id: authUser.user.id })
      .eq("id", clientData.id)

    if (linkError) {
      console.error("Error linking client to user:", linkError)
    }

    // Step 4: Set the role to 'client' in the profile
    // The profile should be auto-created by a trigger, but we'll update it to be sure
    const { error: roleError } = await supabase
      .from("ceva_profiles")
      .update({ role: "client" })
      .eq("id", authUser.user.id)

    if (roleError) {
      // Profile might not exist yet, try to create it
      await supabase.from("ceva_profiles").insert({
        id: authUser.user.id,
        email: data.email,
        full_name: data.name,
        role: "client",
      })
    }

    return {
      success: true,
      message: `Client created successfully! Login: ${data.email} / CevaCitrus2026!`,
      client: clientData,
      authUser: authUser.user,
    }
  } catch (error: any) {
    console.error("Unexpected error:", error)
    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
    }
  }
}

/**
 * Updates an existing client
 */
export async function updateClient(
  id: string,
  data: {
    name: string
    email: string
    contact_number?: string
    pickup_addresses?: any[]
    delivery_addresses?: any[]
    notes?: string
  }
) {
  const supabase = await createClient()

  try {
    const { data: clientData, error } = await supabase
      .from("ceva_clients")
      .update({
        name: data.name,
        email: data.email,
        contact_number: data.contact_number || null,
        pickup_addresses: data.pickup_addresses || [],
        delivery_addresses: data.delivery_addresses || [],
        notes: data.notes || null,
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      return {
        success: false,
        error: `Failed to update client: ${error.message}`,
      }
    }

    return {
      success: true,
      message: "Client updated successfully",
      client: clientData,
    }
  } catch (error: any) {
    return {
      success: false,
      error: `Unexpected error: ${error.message}`,
    }
  }
}
