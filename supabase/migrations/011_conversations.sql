-- Migration: 011_conversations
-- Description: Criação da tabela de controle de conversas (Kanban) e status de atendimento.

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- 1. Criação do Enum para o status da conversa
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_status') THEN
        CREATE TYPE conversation_status AS ENUM ('NEW', 'IN_PROGRESS', 'WAITING_ORDER', 'RESOLVED');
    END IF;
END$$;

-- 2. Criação da Tabela Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE REFERENCES public.customers(id) ON DELETE CASCADE,
  status conversation_status NOT NULL DEFAULT 'NEW',
  internal_notes TEXT,
  last_inbound_at TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índices de Performance
CREATE INDEX IF NOT EXISTS idx_conversations_status ON public.conversations(status);

-- 4. Habilitar RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 5. Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'conversations' 
        AND policyname = 'Authenticated users can manage conversations'
    ) THEN
        CREATE POLICY "Authenticated users can manage conversations"
        ON public.conversations FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END$$;

-- 6. Popular tabela com dados existentes
INSERT INTO public.conversations (customer_id, status, last_inbound_at, last_outbound_at)
SELECT DISTINCT ON (m.customer_id)
  m.customer_id,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM messages m2
      WHERE m2.customer_id = m.customer_id
        AND m2.direction = 'INBOUND'
        AND m2.is_read = false
    ) THEN 'NEW'::conversation_status
    ELSE 'RESOLVED'::conversation_status
  END,
  (SELECT MAX(created_at) FROM messages m3 WHERE m3.customer_id = m.customer_id AND m3.direction = 'INBOUND'),
  (SELECT MAX(created_at) FROM messages m4 WHERE m4.customer_id = m.customer_id AND m4.direction = 'OUTBOUND')
FROM public.messages m
WHERE m.customer_id IS NOT NULL
ON CONFLICT (customer_id) DO NOTHING;

-- ==========================================
-- ROLLBACK MIGRATION (Instruções)
-- Para reverter essa migration, execute:
-- DROP POLICY IF EXISTS "Authenticated users can manage conversations" ON public.conversations;
-- DROP TABLE IF EXISTS public.conversations;
-- DROP TYPE IF EXISTS conversation_status;
-- ==========================================
