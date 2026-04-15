-- Migration: 017_add_assigned_operator_to_conversations
-- Description: Adicionar campo de operador responsável na conversa

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS assigned_operator_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON public.conversations(assigned_operator_id);