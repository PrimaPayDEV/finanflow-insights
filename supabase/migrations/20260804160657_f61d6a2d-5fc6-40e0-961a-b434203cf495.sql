
-- Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','staff')
  )
$$;

-- Backfill: existing accounts are the internal team
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Lock down operational tables
DROP POLICY IF EXISTS "merchants open" ON public.merchants;
DROP POLICY IF EXISTS "pos open" ON public.pos_terminals;
DROP POLICY IF EXISTS "fee_plans open" ON public.fee_plans;
DROP POLICY IF EXISTS "splits open" ON public.split_rules;
DROP POLICY IF EXISTS "transactions open" ON public.transactions;
DROP POLICY IF EXISTS "expenses open" ON public.expenses_adjustments;
DROP POLICY IF EXISTS "closures open" ON public.closures;
DROP POLICY IF EXISTS "imports open" ON public.statements_imports;

REVOKE ALL ON public.merchants, public.pos_terminals, public.fee_plans, public.split_rules,
  public.transactions, public.expenses_adjustments, public.closures, public.statements_imports FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchants, public.pos_terminals, public.fee_plans,
  public.split_rules, public.transactions, public.expenses_adjustments, public.closures,
  public.statements_imports TO authenticated;
GRANT ALL ON public.merchants, public.pos_terminals, public.fee_plans, public.split_rules,
  public.transactions, public.expenses_adjustments, public.closures, public.statements_imports TO service_role;

CREATE POLICY "staff read merchants" ON public.merchants FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write merchants" ON public.merchants FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff read pos_terminals" ON public.pos_terminals FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write pos_terminals" ON public.pos_terminals FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff read fee_plans" ON public.fee_plans FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write fee_plans" ON public.fee_plans FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff read split_rules" ON public.split_rules FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write split_rules" ON public.split_rules FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff read transactions" ON public.transactions FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write transactions" ON public.transactions FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff read expenses" ON public.expenses_adjustments FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write expenses" ON public.expenses_adjustments FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff read closures" ON public.closures FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write closures" ON public.closures FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "staff read imports" ON public.statements_imports FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff write imports" ON public.statements_imports FOR ALL TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
