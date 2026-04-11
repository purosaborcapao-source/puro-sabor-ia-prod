-- Migration: 012_quick_templates
-- Description: Cria a tabela quick_templates para armazenar as repostas rápidas.

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- 1. Criação da Tabela quick_templates
CREATE TABLE IF NOT EXISTS public.quick_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral',
  shortcut TEXT UNIQUE,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.quick_templates ENABLE ROW LEVEL SECURITY;

-- 3. Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'quick_templates' 
        AND policyname = 'Authenticated users can manage templates'
    ) THEN
        CREATE POLICY "Authenticated users can manage templates"
        ON public.quick_templates FOR ALL
        USING (auth.role() = 'authenticated');
    END IF;
END$$;

-- 4. Seed de Dados (Inserção inicial)
INSERT INTO public.quick_templates (title, content, category, shortcut, sort_order) 
VALUES
('Cardápio', 'Olá! Segue nosso cardápio completo. Qualquer dúvida estou à disposição! 🍰', 'vendas', '/cardapio', 1),
('Preço', 'O valor do produto é R$ ___. Gostaria de reservar?', 'vendas', '/preco', 2),
('Agenda', 'Temos disponibilidade para as seguintes datas: ___. Qual prefere?', 'agendamento', '/agenda', 3),
('Confirmação de Pedido', 'Seu pedido foi registrado com sucesso! Número: #___. Assim que confirmarmos o sinal, você recebe a confirmação. ✅', 'pedido', '/confirmado', 4),
('Retirada', 'Seu pedido estará pronto para retirada a partir das ___ no endereço ___.', 'entrega', '/retirada', 5),
('Agradecimento', 'Obrigada pela preferência! Esperamos que goste. Qualquer coisa estamos por aqui. 💚', 'pos-venda', '/obrigada', 6)
ON CONFLICT (shortcut) DO NOTHING;

-- ==========================================
-- ROLLBACK MIGRATION (Instruções)
-- Para reverter essa migration, execute:
-- DROP POLICY IF EXISTS "Authenticated users can manage templates" ON public.quick_templates;
-- DROP TABLE IF EXISTS public.quick_templates;
-- ==========================================
