-- DESATUALIZADO: Esta migration reflete o design inicial. O DB atual usa INBOUND/OUTBOUND em vez de INCOMING/OUTGOING e a coluna message_ref.
-- Criar tipo ENUM para message_direction se não existir
DO $$ BEGIN
  CREATE TYPE public.message_direction AS ENUM ('INCOMING', 'OUTGOING');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Criar tipo ENUM para message_type se não existir
DO $$ BEGIN
  CREATE TYPE public.message_type AS ENUM ('TEXT', 'IMAGE', 'AUDIO', 'DOCUMENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Criar tipo ENUM para message_zapi_status se não existir
DO $$ BEGIN
  CREATE TYPE public.message_zapi_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Criar tabela messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  direction public.message_direction NOT NULL,
  type public.message_type NOT NULL DEFAULT 'TEXT',
  content TEXT NOT NULL,
  payload JSONB DEFAULT '{}', -- intent, extracted_data, suggested_response, etc
  zapi_id TEXT UNIQUE, -- Z-API message ID quando integrado
  zapi_status public.message_zapi_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_messages_customer_id ON public.messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_phone ON public.messages(phone);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_zapi_status ON public.messages(zapi_status);
CREATE INDEX IF NOT EXISTS idx_messages_direction ON public.messages(direction);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Política: ATENDENTE, GERENTE, ADMIN podem ver mensagens
CREATE POLICY "users_can_see_messages" ON public.messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('ATENDENTE', 'ADMIN', 'GERENTE')
    )
  );

-- Política: BOT (service role) pode inserir mensagens
CREATE POLICY "bot_can_insert_messages" ON public.messages
  FOR INSERT
  WITH CHECK (TRUE);

-- Política: BOT (service role) pode atualizar status de mensagens
CREATE POLICY "bot_can_update_messages" ON public.messages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role = 'BOT'
    )
  );

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON public.messages;
CREATE TRIGGER trigger_update_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_messages_updated_at();

-- Adicionar coluna sent_reminder_24h em orders se não existir
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sent_reminder_24h BOOLEAN DEFAULT FALSE;

-- Comentários para documentação
COMMENT ON TABLE public.messages IS 'Histórico de mensagens WhatsApp com customers';
COMMENT ON COLUMN public.messages.payload IS 'JSON com: intent, confidence, extracted_data, suggested_response, should_escalate, raw_text';
COMMENT ON COLUMN public.messages.zapi_status IS 'Status de entrega (Z-API)';
