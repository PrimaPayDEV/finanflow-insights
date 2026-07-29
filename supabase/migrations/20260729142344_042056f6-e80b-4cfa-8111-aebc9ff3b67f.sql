CREATE TYPE public.merchant_status AS ENUM ('active','inactive');
CREATE TYPE public.import_status AS ENUM ('processing','completed','error');
CREATE TYPE public.payment_modality AS ENUM ('pix','debit','credit_vista','credit_installment','cash');
CREATE TYPE public.closure_status AS ENUM ('draft','closed','invoice_generated','paid');

CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document_cnpj text NOT NULL DEFAULT '',
  phone_whatsapp text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  status public.merchant_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchants TO anon, authenticated;
GRANT ALL ON public.merchants TO service_role;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchants open" ON public.merchants FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.pos_terminals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  serial_number text NOT NULL,
  model text NOT NULL DEFAULT '',
  status public.merchant_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX pos_terminals_serial_idx ON public.pos_terminals (serial_number);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pos_terminals TO anon, authenticated;
GRANT ALL ON public.pos_terminals TO service_role;
ALTER TABLE public.pos_terminals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pos open" ON public.pos_terminals FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.merchants(id) ON DELETE CASCADE,
  fixed_rate_percent numeric NOT NULL DEFAULT 0,
  pix_rate numeric NOT NULL DEFAULT 0,
  debit_rate numeric NOT NULL DEFAULT 0,
  credit_vista_rate numeric NOT NULL DEFAULT 0,
  credit_installment_rate numeric NOT NULL DEFAULT 0,
  cash_rate numeric NOT NULL DEFAULT 0,
  traditional_fee_avg numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fee_plans TO anon, authenticated;
GRANT ALL ON public.fee_plans TO service_role;
ALTER TABLE public.fee_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fee_plans open" ON public.fee_plans FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.statements_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.merchants(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  reference_month text NOT NULL,
  status public.import_status NOT NULL DEFAULT 'processing',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.statements_imports TO anon, authenticated;
GRANT ALL ON public.statements_imports TO service_role;
ALTER TABLE public.statements_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "imports open" ON public.statements_imports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  pos_serial text NOT NULL DEFAULT '',
  modality public.payment_modality NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  transaction_date timestamptz NOT NULL DEFAULT now(),
  import_id uuid REFERENCES public.statements_imports(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX transactions_merchant_date_idx ON public.transactions (merchant_id, transaction_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO anon, authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions open" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.expenses_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  reference_month text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses_adjustments TO anon, authenticated;
GRANT ALL ON public.expenses_adjustments TO service_role;
ALTER TABLE public.expenses_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses open" ON public.expenses_adjustments FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  reference_month text NOT NULL,
  total_gross_volume numeric NOT NULL DEFAULT 0,
  total_op_fee_amount numeric NOT NULL DEFAULT 0,
  total_expenses numeric NOT NULL DEFAULT 0,
  net_invoice_amount numeric NOT NULL DEFAULT 0,
  traditional_cost_estimate numeric NOT NULL DEFAULT 0,
  savings_amount numeric NOT NULL DEFAULT 0,
  status public.closure_status NOT NULL DEFAULT 'draft',
  asaas_payment_id text,
  asaas_invoice_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX closures_merchant_month_idx ON public.closures (merchant_id, reference_month);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.closures TO anon, authenticated;
GRANT ALL ON public.closures TO service_role;
ALTER TABLE public.closures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "closures open" ON public.closures FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.split_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  partner_name text NOT NULL,
  partner_asaas_wallet_id text NOT NULL DEFAULT '',
  percentage numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.split_rules TO anon, authenticated;
GRANT ALL ON public.split_rules TO service_role;
ALTER TABLE public.split_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "splits open" ON public.split_rules FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);