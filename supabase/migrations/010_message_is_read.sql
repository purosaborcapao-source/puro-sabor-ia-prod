-- Adicionar coluna is_read na tabela messages
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Atualizar is_read para true nas mensagens antigas (opcional)
UPDATE public.messages SET is_read = true WHERE direction = 'OUTBOUND';
