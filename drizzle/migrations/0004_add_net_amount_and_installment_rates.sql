ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS net_amount numeric;
ALTER TABLE public.fee_plans ADD COLUMN IF NOT EXISTS installment_rates jsonb DEFAULT '{}'::jsonb;