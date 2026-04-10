-- ============================================================
-- Migration 007: Product Visuals and Inventory HUD
-- Purpose: Support rich product experience and storage
-- ============================================================

-- 1. Campos de Imagem e Métricas
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;

-- 2. Criar Bucket de Storage (Se as permissões permitirem via SQL)
-- Nota: Geralmente buckets são criados via dashboard ou API, 
-- mas deixamos as políticas prontas.

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Políticas de Storage para o Bucket
DROP POLICY IF EXISTS "public_read_product_images" ON storage.objects;
CREATE POLICY "public_read_product_images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "authenticated_upload_product_images" ON storage.objects;
CREATE POLICY "authenticated_upload_product_images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

COMMENT ON COLUMN public.products.image_url IS 'URL da imagem hospedada no Supabase Storage';
COMMENT ON COLUMN public.products.min_stock IS 'Nível mínimo de segurança para alertas Visuais (HUD)';
