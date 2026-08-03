CREATE TABLE public.asaas_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  due_day integer NOT NULL DEFAULT 10,
  fine_percent numeric NOT NULL DEFAULT 2,
  interest_percent numeric NOT NULL DEFAULT 1,
  discount_percent numeric NOT NULL DEFAULT 0,
  discount_deadline_days integer NOT NULL DEFAULT 0,
  default_description text NOT NULL DEFAULT 'Fatura PrimaPay',
  sandbox boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asaas_settings TO anon, authenticated;
GRANT ALL ON public.asaas_settings TO service_role;
ALTER TABLE public.asaas_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asaas_settings open" ON public.asaas_settings FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.asaas_webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event text NOT NULL,
  asaas_payment_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.asaas_webhook_events TO anon, authenticated;
GRANT ALL ON public.asaas_webhook_events TO service_role;
ALTER TABLE public.asaas_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asaas_webhook_events read" ON public.asaas_webhook_events FOR SELECT USING (true);

ALTER TABLE public.closures
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS paid_amount numeric;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_asaas_settings_updated_at
BEFORE UPDATE ON public.asaas_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.asaas_settings (id) VALUES ('00000000-0000-0000-0000-000000000001');