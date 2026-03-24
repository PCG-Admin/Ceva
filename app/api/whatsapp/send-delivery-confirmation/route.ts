import { NextRequest, NextResponse } from "next/server"
import { sendTemplateMessage } from "@/lib/whatsapp/service"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: NextRequest) {
  try {
    const { loadId, driverId, driverPhone, driverFirstName, orderNumber, origin, destination } =
      await request.json()

    if (!loadId || !driverId || !driverPhone || !driverFirstName || !orderNumber || !origin || !destination) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Format phone number for WhatsApp (SA country code)
    let phone = driverPhone.replace(/[\s\-\(\)]/g, "")
    if (phone.startsWith("0")) phone = "27" + phone.slice(1)
    if (phone.startsWith("+")) phone = phone.slice(1)

    const result = await sendTemplateMessage({
      to: phone,
      templateName: "delivery_confirmation",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: driverFirstName },
            { type: "text", text: orderNumber },
            { type: "text", text: origin },
            { type: "text", text: destination },
          ],
        },
      ],
    })

    // Extract the WhatsApp message ID from the API response
    const messageId = result.messages?.[0]?.id
    if (!messageId) {
      return NextResponse.json(
        { error: "WhatsApp API did not return a message ID" },
        { status: 500 }
      )
    }

    // Store the message-to-load mapping for webhook lookup
    const supabase = createAdminClient()
    const { error: dbError } = await supabase
      .from("ceva_whatsapp_delivery_confirmations")
      .insert({
        load_id: loadId,
        driver_id: driverId,
        whatsapp_message_id: messageId,
        phone_number: phone,
        status: "sent",
      })

    if (dbError) {
      console.error("Failed to store delivery confirmation mapping:", dbError)
    }

    return NextResponse.json({ ok: true, messageId })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("Send delivery confirmation error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
