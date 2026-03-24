-- Migration: Create WhatsApp Delivery Confirmations tracking table
-- Maps WhatsApp message IDs to load IDs for webhook-based delivery confirmation

CREATE TABLE public.mithon_whatsapp_delivery_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  load_id UUID NOT NULL REFERENCES public.mithon_loads(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.mithon_drivers(id) ON DELETE CASCADE,
  whatsapp_message_id TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for webhook lookups by message ID
CREATE INDEX mithon_whatsapp_delivery_confirmations_message_id_idx
  ON public.mithon_whatsapp_delivery_confirmations(whatsapp_message_id);

-- Index for checking confirmations by load
CREATE INDEX mithon_whatsapp_delivery_confirmations_load_id_idx
  ON public.mithon_whatsapp_delivery_confirmations(load_id);

-- RLS
ALTER TABLE public.mithon_whatsapp_delivery_confirmations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mithon_whatsapp_delivery_confirmations TO authenticated;

CREATE POLICY "Dispatchers and admins can view confirmations"
  ON public.mithon_whatsapp_delivery_confirmations FOR SELECT
  TO authenticated
  USING (
    public.mithon_get_user_role() IN ('dispatcher', 'admin')
  );
