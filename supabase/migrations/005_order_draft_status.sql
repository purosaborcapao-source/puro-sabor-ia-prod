-- Adicionar o status 'RASCUNHO_IA' se houver uma constraint de check na tabela orders
-- Se não houver, esse comando apenas documenta a intenção.
-- Geralmente o status de pedidos é um enum ou um check constraint.

DO $$
BEGIN
    -- Se houver uma constraint chamada 'orders_status_check'
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
        ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
    END IF;

    -- Recriar a constraint permitindo 'RASCUNHO_IA'
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN ('PENDENTE', 'CONFIRMADO', 'PRODUCAO', 'PRONTO', 'ENTREGUE', 'CANCELADO', 'RASCUNHO_IA'));
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Tabela public.orders não encontrada.';
END $$;

COMMENT ON COLUMN public.orders.status IS 'Status do pedido: PENDENTE, CONFIRMADO, PRODUCAO, PRONTO, ENTREGUE, CANCELADO, RASCUNHO_IA';
