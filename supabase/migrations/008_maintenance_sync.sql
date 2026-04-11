-- ============================================================
-- Migration 008: Sync Missing Columns
-- Purpose: Fix HTTP 400 errors caused by missing columns in local Supabase DB
-- ============================================================

-- 1. Fix messages table (Error 1)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='messages' AND column_name='payload') THEN
        ALTER TABLE public.messages ADD COLUMN payload JSONB DEFAULT '{}';
    END IF;
END $$;

COMMENT ON COLUMN public.messages.payload IS 'JSON com: intent, confidence, extracted_data, suggested_response, should_escalate, raw_text';

-- 2. Fix orders table (Error 2)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='sinal_valor') THEN
        ALTER TABLE public.orders ADD COLUMN sinal_valor NUMERIC(10,2) NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='payment_status') THEN
        ALTER TABLE public.orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'SINAL_PENDENTE';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='sinal_confirmado') THEN
        ALTER TABLE public.orders ADD COLUMN sinal_confirmado BOOLEAN NOT NULL DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='conta_corrente') THEN
        ALTER TABLE public.orders ADD COLUMN conta_corrente BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- 3. Fix order_changes table (Error 2)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_changes' AND column_name='is_ai_suggestion') THEN
        ALTER TABLE public.order_changes ADD COLUMN is_ai_suggestion BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='order_changes' AND column_name='status') THEN
        -- Primeiro garantir que o tipo enum existe se não foi criado
        BEGIN
            CREATE TYPE public.order_change_status AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END;
        
        ALTER TABLE public.order_changes ADD COLUMN status public.order_change_status DEFAULT 'APROVADO';
    END IF;
END $$;

-- 4. Garantir índices para performance do MessageInbox e OrderList
CREATE INDEX IF NOT EXISTS idx_messages_payload_gin ON public.messages USING GIN (payload);
CREATE INDEX IF NOT EXISTS idx_order_changes_is_ai_suggestion ON public.order_changes(is_ai_suggestion) WHERE is_ai_suggestion = TRUE;
