ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS brand text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS installments integer NOT NULL DEFAULT 1;