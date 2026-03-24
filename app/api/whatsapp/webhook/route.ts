import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// GET: Meta webhook verification handshake
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 })
}

// POST: Incoming WhatsApp messages (button replies, etc.)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log("Webhook received:", JSON.stringify(body, null, 2))

    const entries = body?.entry ?? []
    for (const entry of entries) {
      const changes = entry?.changes ?? []
      for (const change of changes) {
        const value = change?.value
        if (!value?.messages) continue

        for (const message of value.messages) {
          console.log("Message received:", JSON.stringify(message, null, 2))

          // Quick Reply button taps come through as type "button"
          if (message.type === "button") {
            const buttonPayload = message.button?.payload
            const contextMessageId = message.context?.id
            console.log("Button tap - payload:", buttonPayload, "context:", contextMessageId)

            if (contextMessageId) {
              await handleDeliveryConfirmation(contextMessageId)
            }
          }
        }
      }
    }

    // Always return 200 to Meta to prevent retries
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ ok: true })
  }
}

async function handleDeliveryConfirmation(originalMessageId: string) {
  const supabase = createAdminClient()

  // Look up the confirmation record by the original message ID
  const { data: confirmation, error: lookupError } = await supabase
    .from("ceva_whatsapp_delivery_confirmations")
    .select("id, load_id, status")
    .eq("whatsapp_message_id", originalMessageId)
    .single()

  if (lookupError || !confirmation) {
    console.error("No confirmation found for message:", originalMessageId, lookupError)
    return
  }

  // Guard against duplicate confirmations
  if (confirmation.status === "confirmed") {
    return
  }

  // Check the load hasn't been cancelled
  const { data: load } = await supabase
    .from("ceva_loads")
    .select("status")
    .eq("id", confirmation.load_id)
    .single()

  if (load?.status === "cancelled") {
    console.log("Load was cancelled, ignoring delivery confirmation:", confirmation.load_id)
    return
  }

  // Update load status to delivered
  const { error: loadError } = await supabase
    .from("ceva_loads")
    .update({ status: "delivered" })
    .eq("id", confirmation.load_id)

  if (loadError) {
    console.error("Failed to update load status:", loadError)
    return
  }

  // Mark the confirmation as confirmed
  await supabase
    .from("ceva_whatsapp_delivery_confirmations")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", confirmation.id)

  console.log("Delivery confirmed for load:", confirmation.load_id)
}
