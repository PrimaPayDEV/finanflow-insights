-- Adiciona a coluna rate_table na tabela merchants para associar a tabela de taxas (CPAG59 - F3 ou CPAG56 - F7)
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS rate_table text DEFAULT 'CPAG59';
