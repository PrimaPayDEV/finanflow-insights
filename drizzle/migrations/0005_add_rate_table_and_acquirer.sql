ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS rate_table text DEFAULT 'CPAG59';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS acquirer text DEFAULT '';
NOTIFY pgrst, 'reload schema';