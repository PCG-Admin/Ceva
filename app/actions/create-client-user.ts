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
    // Step 1: Create auth user FIRST with Supabase Admin API
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
      return {
        success: false,
        error: `Failed to create auth user: ${authError.message || JSON.stringify(authError)}`,
      }
    }

    console.log("Auth user created successfully:", authUser.user.id)

    // Step 2: Create the client record with user_id linking to auth user
    const { data: clientData, error: clientError } = await supabase
      .from("ceva_clients")
      .insert({
        name: data.name,
        email: data.email,
        contact_number: data.contact_number || null,
        pickup_addresses: data.pickup_addresses || [],
        delivery_addresses: data.delivery_addresses || [],
        notes: data.notes || null,
        user_id: authUser.user.id, // Link to auth user
      })
      .select()
      .single()

    if (clientError) {
      console.error("Error creating client:", clientError)
      // Auth user was created, so we should try to clean it up
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return {
        success: false,
        error: `Failed to create client: ${clientError.message}`,
      }
    }

    // Step 3: Set the role to 'client' in the profile
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
 * Deletes a client and their auth user account
 */
export async function deleteClientWithUser(clientId: string) {
  const supabase = await createClient()
  const supabaseAdmin = createAdminClient()

  try {
    // Fetch the client to get the linked auth user_id
    const { data: client, error: fetchErr } = await supabase
      .from("ceva_clients")
      .select("id, user_id, name")
      .eq("id", clientId)
      .single()

    if (fetchErr || !client) {
      return { success: false, error: "Client not found." }
    }

    // Delete the client record first (user_id FK is SET NULL on auth user delete,
    // but we want the client row gone too)
    const { error: deleteClientErr } = await supabase
      .from("ceva_clients")
      .delete()
      .eq("id", clientId)

    if (deleteClientErr) {
      return { success: false, error: `Failed to delete client: ${deleteClientErr.message}` }
    }

    // If there is a linked auth user, delete them too
    if (client.user_id) {
      const { error: deleteUserErr } = await supabaseAdmin.auth.admin.deleteUser(client.user_id)
      if (deleteUserErr) {
        // Client record is already gone — log but don't fail the whole operation
        console.error("Client deleted but auth user removal failed:", deleteUserErr.message)
        return {
          success: true,
          warning: "Client deleted, but the portal login account could not be removed. Please remove it manually in Supabase.",
        }
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: `Unexpected error: ${err.message}` }
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
