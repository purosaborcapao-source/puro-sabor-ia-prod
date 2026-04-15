-- Migration: 020_create_settings_table
-- Description: Recria a tabela settings que foi deletada/resetada

-- ==========================================
-- UP MIGRATION
-- ==========================================

-- 1. Criar tabela settings (usa UUID como ID)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- 3. Política de leitura pública
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.settings;
CREATE POLICY "Allow public read access to settings" ON public.settings
  FOR SELECT USING (true);

-- 4. Inserir dados existentes
INSERT INTO public.settings (id, key, value, updated_at) VALUES
('0091b667-9ba9-445f-a72f-3202be1d32f9', 'bot_greeting_config', '{"enabled":false,"shortcuts":[{"key":"1","tips":"","type":"location","title":"Localização","message":"📍 *Nossa Localização*\\n\\nEstamos aqui, é fácil chegar!","maps_url":"","image_url":""},{"key":"2","url":"","tips":"","type":"link","title":"Cardápio","message":"🍰 *Nosso Cardápio*\\n\\nConfira todas as nossas delícias:"},{"key":"3","type":"pix","title":"PIX","message":"💸 *Pagamento via PIX*","pix_key":"","pix_instructions":"Após o pagamento, envie o comprovante aqui para confirmarmos seu pedido! ✅"}],"greeting_message":"Olá! 👋 Seja bem-vindo(a) à *Puro Sabor*!\\n\\nComo posso te ajudar? Escolha uma opção:\\n\\n1️⃣ Localização\\n2️⃣ Cardápio\\n3️⃣ PIX para Pagamento\\n\\nDigite o número da opção 😊","only_when_offline":true}'::jsonb, '2026-04-14 12:26:17.483871+00'),
('0310e6d6-0f57-4163-b31c-490ff890b36b', 'zapi_token', ''::jsonb, '2026-04-08 17:08:39.889971+00'),
('071f413b-b5e0-4dbb-8f62-4e824d5ba5c2', 'sinal_pct', '0'::jsonb, '2026-04-14 18:30:50.973126+00'),
('0ec0c5f1-eff8-4451-a9a4-ca7f571516ae', 'bakery_name', '"Puro Sabor"'::jsonb, '2026-04-08 17:08:39.889971+00'),
('16a7d1f5-2a9a-4d3d-8da3-a7c69c0a1939', 'payment_pix_key', ''::jsonb, '2026-04-14 23:45:04.390256+00'),
('2a9dae60-29a2-41e5-835f-419d21f233c5', 'ai_model', '"claude-haiku-4-5-20251001"'::jsonb, '2026-04-08 17:08:39.889971+00'),
('3354fa88-60c3-4cf4-b940-2e7ebd99ef11', 'session_duration_hours', '1'::jsonb, '2026-04-14 18:30:50.973126+00'),
('534c2ef4-7156-48c7-80bf-b86fd0ddf49f', 'opening_hours', '{"dom":"08:00-16:00","qua":"08:00-19:00","qui":"08:00-19:00","sab":"08:00-19:00","seg":"08:00-19:00","sex":"08:00-19:00","ter":"08:00-19:00"}'::jsonb, '2026-04-08 17:08:39.889971+00'),
('6dbeef73-d6d7-43d8-bb94-22cf155bda0e', 'dedup_window_seconds', '30'::jsonb, '2026-04-14 18:30:50.973126+00'),
('72251f6b-0794-4912-a5f7-30bb42ebf904', 'min_lead_time', '4'::jsonb, '2026-04-08 17:08:39.889971+00'),
('8175d0d8-4a7d-45d0-9732-b581e47c99fa', 'ai_system_prompt', ''::jsonb, '2026-04-14 23:45:04.390256+00'),
('995d7217-aa73-4d0a-94af-c53109a79802', 'ai_prompt', '"Você é o assistente virtual da Puro Sabor, uma confeitaria especializada em bolos personalizados. Atenda com simpatia, ajude o cliente a montar seu pedido e sempre confirme antes de fechar."'::jsonb, '2026-04-08 17:08:39.889971+00'),
('a1a4378c-68bd-45d3-8ce2-1748b702bd02', 'zapi_instance', ''::jsonb, '2026-04-08 17:08:39.889971+00'),
('c17283cc-d19d-4fa0-ae25-fc682b80f943', 'payment_overpayment_tolerance_pct', '0'::jsonb, '2026-04-14 18:30:50.973126+00'),
('d6428017-746a-43bb-a198-a79fda828f4f', 'ai_temperature', '0'::jsonb, '2026-04-08 17:08:39.889971+00'),
('ddeee2e4-ac70-4bd6-a29b-22ba76bff413', 'bakery_phone', '"5551999056903"'::jsonb, '2026-04-08 17:08:39.889971+00'),
('e09f5079-1a85-43ba-84c1-cf6eb67a7b4c', 'min_lead_time_hours', '0'::jsonb, '2026-04-09 21:09:09.624364+00'),
('ea08df98-41f0-4d34-85f1-e73db5cd15d8', 'payment_bank_info', ''::jsonb, '2026-04-14 23:45:04.390256+00'),
('ecc327e4-31cb-489c-9c6b-41ed65127bf0', 'upload_max_size_mb', '5'::jsonb, '2026-04-14 18:30:50.973126+00'),
('f217b8a6-216a-4644-8dd6-c820c62ecd3f', 'max_discount', '10'::jsonb, '2026-04-08 17:08:39.889971+00'),
('f4654c5e-1a1c-454d-9adc-6dc9c19ffa78', 'max_orders_day', '5'::jsonb, '2026-04-08 17:08:39.889971+00'),
('f623c5ac-d92e-4160-9ba1-2d59c8e75012', 'heartbeat_interval_minutes', '5'::jsonb, '2026-04-14 18:30:50.973126+00'),
('f7ea6453-7808-4679-b293-a3578d0a7218', 'greeting_window_minutes', '30'::jsonb, '2026-04-14 18:30:50.973126+00')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- ROLLBACK MIGRATION
-- DROP TABLE IF EXISTS public.settings;
-- ==========================================