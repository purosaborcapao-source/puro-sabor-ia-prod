-- Migration: 016_greeting_and_shortcuts
-- Description: Adiciona suporte ao sistema de saudação automática e atalhos rápidos do bot.

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- 1. Adicionar coluna greeting_sent_at na tabela conversations
--    Registra quando a saudação automática foi enviada ao cliente
ALTER TABLE public.conversations
ADD COLUMN IF NOT EXISTS greeting_sent_at TIMESTAMPTZ;

-- 2. Seed de configuração padrão do bot na tabela settings
--    Armazena toda a configuração de saudação + atalhos como JSON
INSERT INTO public.settings (key, value)
VALUES (
  'bot_greeting_config',
  '{
    "enabled": false,
    "only_when_offline": true,
    "greeting_message": "Olá! 👋 Seja bem-vindo(a) à *Puro Sabor*!\n\nComo posso te ajudar? Escolha uma opção:\n\n1️⃣ Localização\n2️⃣ Cardápio\n3️⃣ PIX para Pagamento\n\nDigite o número da opção 😊",
    "shortcuts": [
      {
        "key": "1",
        "title": "Localização",
        "type": "location",
        "message": "📍 *Nossa Localização*\n\nEstamos aqui, é fácil chegar!",
        "maps_url": "",
        "image_url": "",
        "tips": ""
      },
      {
        "key": "2",
        "title": "Cardápio",
        "type": "link",
        "message": "🍰 *Nosso Cardápio*\n\nConfira todas as nossas delícias:",
        "url": "",
        "tips": ""
      },
      {
        "key": "3",
        "title": "PIX",
        "type": "pix",
        "message": "💸 *Pagamento via PIX*",
        "pix_key": "",
        "pix_instructions": "Após o pagamento, envie o comprovante aqui para confirmarmos seu pedido! ✅"
      }
    ]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- ROLLBACK MIGRATION (Instruções)
-- Para reverter essa migration, execute:
-- ALTER TABLE public.conversations DROP COLUMN IF EXISTS greeting_sent_at;
-- DELETE FROM public.settings WHERE key = 'bot_greeting_config';
-- ==========================================
