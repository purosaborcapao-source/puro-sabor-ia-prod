-- ============================================================
-- Payment Sync Test Suite
-- Purpose: Validate that payment sync is working correctly
-- Run this in Supabase SQL Editor to test
-- ============================================================

-- TEST 1: Verificar se as colunas existem
-- Expected: 2 rows (total_received, balance_due)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
AND column_name IN ('total_received', 'balance_due')
ORDER BY column_name;

-- TEST 2: Verificar se os triggers foram criados
-- Expected: 4 rows (3 payment_entries + 1 orders)
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE 'trg_sync%'
ORDER BY trigger_name;

-- TEST 3: Verificar se as funções existem
-- Expected: 2 functions
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name = 'calculate_order_final_total'
  OR routine_name = 'sync_order_payment_totals')
ORDER BY routine_name;

-- TEST 4: Verificar dados sincronizados
-- Expected: Todos os pedidos com balance_due = (total + delivery_fee - discount)
SELECT
  id,
  number,
  total,
  COALESCE(delivery_fee, 0) as delivery_fee,
  COALESCE(discount, 0) as discount,
  total_received,
  balance_due,
  -- Calculo manual para comparar
  (total + COALESCE(delivery_fee, 0) - COALESCE(discount, 0)) - total_received as expected_balance,
  -- Validação
  CASE
    WHEN balance_due = (total + COALESCE(delivery_fee, 0) - COALESCE(discount, 0)) - total_received THEN '✅ OK'
    ELSE '❌ ERRO'
  END as validation
FROM orders
WHERE total_received > 0 OR balance_due > 0
LIMIT 10;

-- TEST 5: Testar trigger com inserção de pagamento fictício
-- Este teste simula o fluxo real
BEGIN;
  -- 1. Encontrar um pedido sem pagamentos confirmados
  WITH target_order AS (
    SELECT id, total
    FROM orders
    WHERE total > 0
    AND id NOT IN (
      SELECT DISTINCT order_id
      FROM payment_entries
      WHERE status = 'CONFIRMADO'
    )
    LIMIT 1
  )
  -- 2. Registrar um pagamento de teste
  INSERT INTO payment_entries (
    order_id,
    type,
    method,
    valor,
    registered_by,
    status,
    confirmed_by,
    confirmed_at,
    registered_at,
    notes
  )
  SELECT
    to.id,
    'SINAL'::payment_type,
    'DINHEIRO',
    to.total * 0.5, -- 50% do valor total
    auth.uid(),
    'CONFIRMADO'::payment_confirmation_status,
    auth.uid(),
    NOW(),
    NOW(),
    'Pagamento de teste automático'
  FROM target_order to
  RETURNING order_id, valor, status;

-- Verificar se o trigger atualizou corretamente
  SELECT
    id,
    total,
    total_received,
    balance_due,
    (total - total_received) as expected_balance
  FROM orders
  WHERE total_received > 0
  LIMIT 1;

-- Rollback (desfaz o pagamento de teste)
ROLLBACK;

-- TEST 6: Validar índices foram criados
-- Expected: 2 index rows
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename = 'orders'
AND (indexname LIKE 'idx_orders%')
ORDER BY indexname;

-- TEST 7: Performance check - verificar quantidade de pagamentos
-- Ajuda a entender o volume de dados
SELECT
  status,
  COUNT(*) as total,
  SUM(valor) as soma_valores
FROM payment_entries
GROUP BY status
ORDER BY status;

-- TEST 8: Relatório de pedidos por status de pagamento
-- Útil para dashboard
SELECT
  payment_status,
  COUNT(*) as total_pedidos,
  SUM(total) as valor_total,
  SUM(total_received) as valor_recebido,
  SUM(balance_due) as valor_devido,
  ROUND(100.0 * SUM(total_received) / NULLIF(SUM(total), 0), 2) as percentual_pago
FROM orders
GROUP BY payment_status
ORDER BY payment_status;

-- TEST 9: Verificar se há inconsistências
-- Expected: 0 rows (significa que tudo está correto)
SELECT
  id,
  number,
  total,
  total_received,
  balance_due,
  (total - total_received) as calculated_balance,
  ABS(balance_due - ((total + COALESCE(delivery_fee, 0) - COALESCE(discount, 0)) - total_received)) as discrepancy
FROM orders
WHERE balance_due != (total + COALESCE(delivery_fee, 0) - COALESCE(discount, 0)) - total_received
  OR balance_due < 0
LIMIT 10;

-- TEST 10: Mostrar amostra de dados sincronizados
-- Pedidos com algum pagamento
SELECT
  o.id,
  o.number,
  c.name as customer_name,
  o.total as valor_pedido,
  o.total_received as recebido,
  o.balance_due as devido,
  o.payment_status as status_pagamento,
  COUNT(pe.id) as total_pagamentos
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN payment_entries pe ON o.id = pe.order_id AND pe.status = 'CONFIRMADO'
WHERE o.total_received > 0
GROUP BY o.id, o.number, c.name, o.total, o.total_received, o.balance_due, o.payment_status
LIMIT 5;

-- ============================================================
-- SUMMARY
-- ============================================================
-- Se todos os testes passarem (retornar dados esperados):
-- ✅ Migration foi aplicada com sucesso
-- ✅ Triggers estão funcionando
-- ✅ Funções estão criadas
-- ✅ Dados estão sincronizados
-- ✅ Índices foram criados
-- ✅ Sistema está pronto para produção
-- ============================================================
