import { NextRequest, NextResponse } from "next/server"
import { sendTemplateMessage } from "@/lib/whatsapp/service"

export async function POST(request: NextRequest) {
  try {
    const { to, templateName, languageCode, components } = await request.json()

    if (!to || !templateName) {
      return NextResponse.json(
        { error: "Missing required fields: to, templateName" },
        { status: 400 }
      )
    }

    const result = await sendTemplateMessage({ to, templateName, languageCode, components })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
