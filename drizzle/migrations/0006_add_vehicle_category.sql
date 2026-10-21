-- Adiciona a coluna category na tabela vehicles para classificação de proteção veicular
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS category text DEFAULT 'Leves e utilitários';
