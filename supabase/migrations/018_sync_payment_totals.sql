-- ============================================================
-- Migration 018: Sync Payment Totals
-- Purpose: Add automatic synchronization of total_received and
--          balance_due from payment_entries to orders table
-- Author: Claude Code
-- Date: 2026-04-15
-- ============================================================

-- ============================================================
-- STEP 1: Add columns to orders table (with safety checks)
-- ============================================================
DO $$
BEGIN
    -- Add total_received column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
        AND table_name='orders'
        AND column_name='total_received'
    ) THEN
        ALTER TABLE public.orders
        ADD COLUMN total_received NUMERIC(10,2) NOT NULL DEFAULT 0;

        COMMENT ON COLUMN public.orders.total_received IS
        'Total amount received from confirmed payment entries. Synced automatically via trigger.';
    END IF;

    -- Add balance_due column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public'
        AND table_name='orders'
        AND column_name='balance_due'
    ) THEN
        ALTER TABLE public.orders
        ADD COLUMN balance_due NUMERIC(10,2) NOT NULL DEFAULT 0;

        COMMENT ON COLUMN public.orders.balance_due IS
        'Amount still due = (total + delivery_fee - discount) - total_received. Synced automatically via trigger.';
    END IF;
END $$;

-- ============================================================
-- STEP 2: Calculate final_total helper function
-- Purpose: Calculate final order total (total + delivery_fee - discount)
-- ============================================================
CREATE OR REPLACE FUNCTION calculate_order_final_total(
    p_order_id UUID
)
RETURNS NUMERIC(10,2) AS $$
DECLARE
    v_total NUMERIC(10,2);
    v_delivery_fee NUMERIC(10,2);
    v_discount NUMERIC(10,2);
BEGIN
    SELECT
        COALESCE(total, 0),
        COALESCE(delivery_fee, 0),
        COALESCE(discount, 0)
    INTO v_total, v_delivery_fee, v_discount
    FROM public.orders
    WHERE id = p_order_id;

    RETURN GREATEST(0, v_total + v_delivery_fee - v_discount);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- STEP 3: Main sync function (TRIGGER FUNCTION)
-- Purpose: Synchronize payment totals whenever payment_entries change
-- Safety: Uses transaction-safe calculations
-- ============================================================
CREATE OR REPLACE FUNCTION sync_order_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_order_id UUID;
    v_total_received NUMERIC(10,2);
    v_final_total NUMERIC(10,2);
    v_balance_due NUMERIC(10,2);
BEGIN
    -- Determine which order we're dealing with
    v_order_id := COALESCE(NEW.order_id, OLD.order_id);

    IF v_order_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate total received from CONFIRMED payments only
    SELECT COALESCE(SUM(valor), 0)
    INTO v_total_received
    FROM public.payment_entries
    WHERE order_id = v_order_id
    AND status = 'CONFIRMADO';

    -- Calculate final order total
    v_final_total := calculate_order_final_total(v_order_id);

    -- Calculate balance due (with safety check to prevent negative)
    v_balance_due := GREATEST(0, v_final_total - v_total_received);

    -- Update the orders table with calculated values
    UPDATE public.orders
    SET
        total_received = v_total_received,
        balance_due = v_balance_due,
        updated_at = NOW()
    WHERE id = v_order_id;

    RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in sync_order_payment_totals for order %: %', v_order_id, SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- STEP 4: Create triggers on payment_entries
-- Trigger 1: After INSERT on payment_entries
-- ============================================================
DROP TRIGGER IF EXISTS trg_sync_payment_on_insert ON public.payment_entries;
CREATE TRIGGER trg_sync_payment_on_insert
AFTER INSERT ON public.payment_entries
FOR EACH ROW
EXECUTE FUNCTION sync_order_payment_totals();

-- ============================================================
-- Trigger 2: After UPDATE on payment_entries
-- ============================================================
DROP TRIGGER IF EXISTS trg_sync_payment_on_update ON public.payment_entries;
CREATE TRIGGER trg_sync_payment_on_update
AFTER UPDATE ON public.payment_entries
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.valor IS DISTINCT FROM NEW.valor)
EXECUTE FUNCTION sync_order_payment_totals();

-- ============================================================
-- Trigger 3: After DELETE on payment_entries
-- ============================================================
DROP TRIGGER IF EXISTS trg_sync_payment_on_delete ON public.payment_entries;
CREATE TRIGGER trg_sync_payment_on_delete
AFTER DELETE ON public.payment_entries
FOR EACH ROW
EXECUTE FUNCTION sync_order_payment_totals();

-- ============================================================
-- STEP 5: Create trigger on orders table
-- Purpose: Update balance_due when order totals change
-- ============================================================
DROP TRIGGER IF EXISTS trg_sync_order_totals_on_update ON public.orders;
CREATE TRIGGER trg_sync_order_totals_on_update
AFTER UPDATE ON public.orders
FOR EACH ROW
WHEN (
    OLD.total IS DISTINCT FROM NEW.total
    OR OLD.delivery_fee IS DISTINCT FROM NEW.delivery_fee
    OR OLD.discount IS DISTINCT FROM NEW.discount
)
EXECUTE FUNCTION sync_order_payment_totals();

-- ============================================================
-- STEP 6: Initialize existing data (IMPORTANT!)
-- Purpose: Calculate and populate total_received and balance_due
--          for all existing orders
-- ============================================================
WITH order_calculations AS (
    SELECT
        o.id,
        COALESCE(SUM(CASE WHEN pe.status = 'CONFIRMADO' THEN pe.valor ELSE 0 END), 0) as total_received,
        GREATEST(0,
            (o.total + COALESCE(o.delivery_fee, 0) - COALESCE(o.discount, 0)) -
            COALESCE(SUM(CASE WHEN pe.status = 'CONFIRMADO' THEN pe.valor ELSE 0 END), 0)
        ) as balance_due
    FROM public.orders o
    LEFT JOIN public.payment_entries pe ON o.id = pe.order_id
    GROUP BY o.id, o.total, o.delivery_fee, o.discount
)
UPDATE public.orders o
SET
    total_received = oc.total_received,
    balance_due = oc.balance_due
FROM order_calculations oc
WHERE o.id = oc.id;

-- ============================================================
-- STEP 7: Create indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_orders_total_received
    ON public.orders(total_received)
    WHERE total_received > 0;

CREATE INDEX IF NOT EXISTS idx_orders_balance_due
    ON public.orders(balance_due)
    WHERE balance_due > 0;

-- ============================================================
-- STEP 8: Grant permissions (if needed)
-- ============================================================
GRANT EXECUTE ON FUNCTION calculate_order_final_total(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION sync_order_payment_totals() TO authenticated, anon;

-- ============================================================
-- END OF MIGRATION 018
-- ============================================================
COMMENT ON FUNCTION sync_order_payment_totals() IS
'Automatically synchronizes total_received and balance_due in orders table
when payment_entries are inserted, updated, or deleted. Triggered by three
separate triggers (INSERT, UPDATE, DELETE) on payment_entries table, and one
UPDATE trigger on orders table for total/delivery_fee/discount changes.';
