-- ============================================================
-- TABELA: delivery_slots (Agendamento de entregas)
-- ============================================================
-- Registra disponibilidade de datas para entrega
-- Cada dia tem limite máximo de pedidos

CREATE TABLE IF NOT EXISTS delivery_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  max_orders INT NOT NULL DEFAULT 20,
  current_orders INT NOT NULL DEFAULT 0,
  blocked BOOLEAN NOT NULL DEFAULT false,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para queries rápidas
CREATE INDEX IF NOT EXISTS idx_delivery_slots_date ON delivery_slots(date);
CREATE INDEX IF NOT EXISTS idx_delivery_slots_blocked ON delivery_slots(blocked);

-- ============================================================
-- TRIGGER: atualizar updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_delivery_slots_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_delivery_slots_updated_at ON delivery_slots;
CREATE TRIGGER trigger_delivery_slots_updated_at
  BEFORE UPDATE ON delivery_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_slots_updated_at();

-- ============================================================
-- RLS: delivery_slots
-- ============================================================
ALTER TABLE delivery_slots ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver slots
CREATE POLICY "delivery_slots: authenticated read"
  ON delivery_slots FOR SELECT
  USING (get_my_role() in ('ADMIN', 'GERENTE', 'ATENDENTE', 'PRODUTOR'));

-- Somente ADMIN/GERENTE podem editar
CREATE POLICY "delivery_slots: admin update"
  ON delivery_slots FOR UPDATE
  USING (get_my_role() in ('ADMIN', 'GERENTE'));

CREATE POLICY "delivery_slots: admin insert"
  ON delivery_slots FOR INSERT
  WITH CHECK (get_my_role() in ('ADMIN', 'GERENTE'));

-- ============================================================
-- FUNÇÃO: criar slots padrão para próximos 90 dias
-- ============================================================
CREATE OR REPLACE FUNCTION initialize_delivery_slots()
RETURNS void AS $$
DECLARE
  start_date DATE := CURRENT_DATE;
  end_date DATE := CURRENT_DATE + INTERVAL '90 days';
  current_date DATE := start_date;
BEGIN
  WHILE current_date <= end_date LOOP
    -- Não criar para domingos (1 = segunda, 7 = domingo)
    IF EXTRACT(DOW FROM current_date) != 0 THEN
      INSERT INTO delivery_slots (date, max_orders, current_orders, blocked)
      VALUES (current_date, 20, 0, false)
      ON CONFLICT (date) DO NOTHING;
    END IF;
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Executar inicialização
SELECT initialize_delivery_slots();
