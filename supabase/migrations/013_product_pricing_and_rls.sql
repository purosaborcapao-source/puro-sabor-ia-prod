-- 013: Lógica de Precificação e Venda por Tipo e RLS Público
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS sale_unit TEXT NOT NULL DEFAULT 'UNIDADE'
    CHECK (sale_unit IN ('UNIDADE', 'CENTO', 'KG')),
  ADD COLUMN IF NOT EXISTS min_qty INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS qty_step NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS has_decoration_option BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN products.sale_unit IS 'UNIDADE: preço por un | CENTO: preço por 100un | KG: preço por kg';
COMMENT ON COLUMN products.min_qty IS 'Qtd mínima (ex: 25 un ou 500g)';
COMMENT ON COLUMN products.qty_step IS 'Incremento (ex: 25 un ou 500g)';
COMMENT ON COLUMN products.has_decoration_option IS 'Habilita seleção de Decoração Padrão/Personalizada';

-- Políticas de RLS para acesso anônimo (Público)

-- 1. Produtos
CREATE POLICY "public_select_active_products" 
ON products FOR SELECT 
TO anon 
USING (is_active = true);

-- 2. Clientes (Permitir upsert anônimo para vinculação por telefone)
CREATE POLICY "anon_upsert_customer"
ON customers FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "anon_update_customer"
ON customers FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 3. Pedidos
CREATE POLICY "anon_insert_order"
ON orders FOR INSERT
TO anon
WITH CHECK (true);

-- 4. Itens do Pedido
CREATE POLICY "anon_insert_order_items"
ON order_items FOR INSERT
TO anon
WITH CHECK (true);
