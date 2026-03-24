// ---- Configuration ----

function getConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp API configuration missing. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env.local"
    )
  }

  return { phoneNumberId, accessToken }
}

const GRAPH_API_VERSION = "v22.0"

// ---- Types ----

export interface WhatsAppTemplateComponent {
  type: "body" | "header" | "button"
  sub_type?: "quick_reply" | "url"
  index?: string
  parameters: Array<{
    type: "text" | "image" | "document" | "payload"
    text?: string
  }>
}

export interface SendTemplateMessageParams {
  to: string // Phone number with country code, e.g. "27821234567"
  templateName: string
  languageCode?: string
  components?: WhatsAppTemplateComponent[]
}

interface WhatsAppApiResponse {
  messaging_product: string
  contacts: Array<{ input: string; wa_id: string }>
  messages: Array<{ id: string; message_status?: string }>
}

// ---- Public API methods ----

export async function sendTemplateMessage({
  to,
  templateName,
  languageCode = "en",
  components,
}: SendTemplateMessageParams): Promise<WhatsAppApiResponse> {
  const { phoneNumberId, accessToken } = getConfig()

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components && components.length > 0 ? { components } : {}),
    },
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
    throw new Error(
      `WhatsApp API request failed with HTTP ${response.status}: ${error?.error?.message ?? response.statusText}`
    )
  }

  return response.json()
}
