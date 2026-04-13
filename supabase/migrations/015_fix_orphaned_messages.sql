-- Migration: 015_fix_orphaned_messages
-- Description: Vincula mensagens órfãs (customer_id nulo) ao customer correto pelo phone.

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- 1. Verificar quantas mensagens órfãs existem
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM messages
    WHERE customer_id IS NULL AND phone IS NOT NULL;
    
    RAISE NOTICE 'Mensagens órfãs encontradas: %', orphan_count;
END $$;

-- 2. Vincular mensagens órfãs ao customer pelo phone exato
UPDATE messages m
SET customer_id = c.id
FROM customers c
WHERE m.customer_id IS NULL 
  AND m.phone IS NOT NULL
  AND m.phone = c.phone
  AND m.direction = 'OUTBOUND';

-- 3. Vincular mensagens órfãs por variação de phone (com/sem DDD 55)
-- 55xxxxxxx -> xxxxxxx
UPDATE messages m
SET customer_id = c.id
FROM customers c
WHERE m.customer_id IS NULL 
  AND m.phone IS NOT NULL
  AND c.phone IS NOT NULL
  AND (
    (m.phone = '55' || c.phone AND LEFT(m.phone, 2) = '55')
    OR (c.phone = '55' || m.phone AND LEFT(c.phone, 2) = '55')
  )
  AND m.direction = 'OUTBOUND';

-- 4. Vincular por sufixo de 8 dígitos
UPDATE messages m
SET customer_id = c.id
FROM customers c
WHERE m.customer_id IS NULL 
  AND m.phone IS NOT NULL
  AND c.phone IS NOT NULL
  AND RIGHT(m.phone, 8) = RIGHT(c.phone, 8)
  AND m.direction = 'OUTBOUND';

-- 5. Vincular INBOUND órfãos também
UPDATE messages m
SET customer_id = c.id
FROM customers c
WHERE m.customer_id IS NULL 
  AND m.phone IS NOT NULL
  AND m.phone = c.phone;

-- 6. Verificar resultado
DO $$
DECLARE
    remaining_orphans INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_orphans
    FROM messages
    WHERE customer_id IS NULL AND phone IS NOT NULL;
    
    RAISE NOTICE 'Mensagens órfãs restantes: %', remaining_orphans;
END $$;

-- 7. Opcional: Deletar mensagens que não puderam ser vinculadas (apenas se não forem importantes)
-- ATENÇÃO: Descomente apenas se tiver certeza
-- DELETE FROM messages WHERE customer_id IS NULL AND phone IS NOT NULL;

-- ==========================================
-- ROLLBACK MIGRATION
-- ==========================================
-- A operação é UPDATE, então não tem rollback automático
-- Para reverter, seria necessário um backup prévio dos dados
-- ==========================================