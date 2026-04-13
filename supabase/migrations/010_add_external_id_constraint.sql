-- Migration 010: Add external_id column for webhook idempotency
-- The webhook uses onConflict: 'external_id' but the column doesn't exist

-- 1. Add external_id column
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

-- 2. Create index for lookups
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages(external_id);

COMMENT ON COLUMN public.messages.external_id IS 'External unique identifier for webhook deduplication (Z-API messageId or fallback hash)';