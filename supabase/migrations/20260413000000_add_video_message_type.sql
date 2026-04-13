-- Adiciona o tipo VIDEO ao enum message_type para suporte a mídias de vídeo
ALTER TYPE public.message_type ADD VALUE IF NOT EXISTS 'VIDEO';
