-- Adiciona os campos de mensalidade e valor da tabela FIPE na tabela de veículos
ALTER TABLE IF EXISTS public.vehicles 
ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10, 2) DEFAULT 179.90,
ADD COLUMN IF NOT EXISTS fipe_value NUMERIC(12, 2);
