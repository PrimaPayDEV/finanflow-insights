ALTER TABLE public.fee_plans ADD COLUMN IF NOT EXISTS installment_rates jsonb DEFAULT '{}'::jsonb;
