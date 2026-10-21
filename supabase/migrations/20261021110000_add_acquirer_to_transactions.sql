-- Adiciona a coluna acquirer na tabela transactions para identificar a adquirente da transação (ex: F7, F6)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS acquirer text DEFAULT '';
