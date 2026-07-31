-- Revoke anon access and restrict policies to authenticated users ONLY

-- merchants
REVOKE ALL ON public.merchants FROM anon;
DROP POLICY IF EXISTS "merchants open" ON public.merchants;
CREATE POLICY "merchants authenticated only" ON public.merchants FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- pos_terminals
REVOKE ALL ON public.pos_terminals FROM anon;
DROP POLICY IF EXISTS "pos open" ON public.pos_terminals;
CREATE POLICY "pos authenticated only" ON public.pos_terminals FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- fee_plans
REVOKE ALL ON public.fee_plans FROM anon;
DROP POLICY IF EXISTS "fee_plans open" ON public.fee_plans;
CREATE POLICY "fee_plans authenticated only" ON public.fee_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- statements_imports
REVOKE ALL ON public.statements_imports FROM anon;
DROP POLICY IF EXISTS "imports open" ON public.statements_imports;
CREATE POLICY "imports authenticated only" ON public.statements_imports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- transactions
REVOKE ALL ON public.transactions FROM anon;
DROP POLICY IF EXISTS "transactions open" ON public.transactions;
CREATE POLICY "transactions authenticated only" ON public.transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- expenses_adjustments
REVOKE ALL ON public.expenses_adjustments FROM anon;
DROP POLICY IF EXISTS "expenses open" ON public.expenses_adjustments;
CREATE POLICY "expenses authenticated only" ON public.expenses_adjustments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- closures
REVOKE ALL ON public.closures FROM anon;
DROP POLICY IF EXISTS "closures open" ON public.closures;
CREATE POLICY "closures authenticated only" ON public.closures FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- split_rules
REVOKE ALL ON public.split_rules FROM anon;
DROP POLICY IF EXISTS "splits open" ON public.split_rules;
CREATE POLICY "splits authenticated only" ON public.split_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- notifications
REVOKE ALL ON public.notifications FROM anon;
DROP POLICY IF EXISTS "Enable all access for notifications" ON public.notifications;
CREATE POLICY "notifications authenticated only" ON public.notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
