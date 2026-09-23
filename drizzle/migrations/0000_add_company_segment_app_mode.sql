ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS segment text,
  ADD COLUMN IF NOT EXISTS app_mode text NOT NULL DEFAULT 'full';