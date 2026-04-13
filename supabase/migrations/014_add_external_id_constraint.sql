-- Migration 010: Add external_id column for webhook idempotency
-- Execute via Supabase SQL Editor

-- 1. Add external_id column if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN external_id TEXT UNIQUE;
  END IF;
END $$;

-- 2. Create index for lookups
CREATE INDEX IF NOT EXISTS idx_messages_external_id ON public.messages(external_id);