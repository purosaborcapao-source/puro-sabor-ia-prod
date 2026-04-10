-- ============================================================
-- Migration 006: AI Checkpoints and Suggestions
-- Purpose: Support on-demand AI analysis and human-in-the-loop approvals
-- ============================================================

-- 1. Checkpoint de Análise no Cliente
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS last_ai_analysis_at TIMESTAMPTZ;

-- 2. Status de Sugestão em Alterações de Pedido
-- Primeiro criar o enum se não existir
DO $$ BEGIN
    CREATE TYPE public.order_change_status AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.order_changes
ADD COLUMN IF NOT EXISTS is_ai_suggestion BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS status public.order_change_status DEFAULT 'APROVADO', -- Default APROVADO para mudanças manuais
ADD COLUMN IF NOT EXISTS suggestion_data JSONB; -- Para guardar dados complexos da sugestão (ex: novos valores)

-- Atualizar status para PENDENTE apenas nas futuras sugestões da IA
COMMENT ON COLUMN public.order_changes.is_ai_suggestion IS 'Define se a alteração foi proposta pela IA e aguarda revisão humana';
COMMENT ON COLUMN public.order_changes.suggestion_data IS 'Dados estruturados da sugestão (ex: novo_total, itens_adicionados)';

-- 3. Índice para busca de sugestões pendentes
CREATE INDEX IF NOT EXISTS idx_order_changes_suggestion_pending 
ON public.order_changes(order_id, status) 
WHERE is_ai_suggestion = TRUE AND status = 'PENDENTE';

-- 4. Garantir que o ROBÔ da IA possa inserir em order_changes
-- (A política já permite ATENDENTE, mas vamos garantir acesso para a service role)
DROP POLICY IF EXISTS "bot_can_insert_order_changes" ON public.order_changes;
CREATE POLICY "bot_can_insert_order_changes" ON public.order_changes
FOR INSERT
WITH CHECK (TRUE);
