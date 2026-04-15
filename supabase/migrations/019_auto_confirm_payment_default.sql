-- ============================================================
-- Migration 019: Auto-Confirm Payment Default
-- Purpose: Change default payment status to CONFIRMADO
--          to ensure all new payments are auto-confirmed
-- Author: Claude Code
-- Date: 2026-04-15
-- ============================================================

-- ============================================================
-- STEP 1: Update payment_entries table default
-- Purpose: New payments will default to CONFIRMADO status
-- ============================================================
ALTER TABLE public.payment_entries
ALTER COLUMN status SET DEFAULT 'CONFIRMADO';

COMMENT ON COLUMN public.payment_entries.status IS
'Payment confirmation status. Defaults to CONFIRMADO for automatic processing.
Valid values: CONFIRMADO, AGUARDANDO_CONFIRMACAO (legacy), REJEITADO';

-- ============================================================
-- STEP 2: Update existing pending payments to CONFIRMADO
-- Purpose: Convert legacy AGUARDANDO_CONFIRMACAO entries
--          to CONFIRMADO status for full automation
-- ============================================================
UPDATE public.payment_entries
SET status = 'CONFIRMADO',
    confirmed_at = COALESCE(confirmed_at, NOW()),
    updated_at = NOW()
WHERE status = 'AGUARDANDO_CONFIRMACAO';

COMMENT ON COLUMN public.payment_entries.status IS
'Payment confirmation status. All payments are auto-confirmed (CONFIRMADO).
Legacy status AGUARDANDO_CONFIRMACAO is no longer used.';

-- ============================================================
-- END OF MIGRATION 019
-- ============================================================
