-- Refine RLS to only allow admin access instead of any authenticated user
-- This requires public.has_role(auth.uid(), 'admin'::public.app_role)

-- merchants
DROP POLICY IF EXISTS "merchants open" ON public.merchants;
DROP POLICY IF EXISTS "merchants authenticated only" ON public.merchants;
CREATE POLICY "merchants admin only" ON public.merchants FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- pos_terminals
DROP POLICY IF EXISTS "pos open" ON public.pos_terminals;
DROP POLICY IF EXISTS "pos authenticated only" ON public.pos_terminals;
CREATE POLICY "pos admin only" ON public.pos_terminals FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- fee_plans
DROP POLICY IF EXISTS "fee_plans open" ON public.fee_plans;
DROP POLICY IF EXISTS "fee_plans authenticated only" ON public.fee_plans;
CREATE POLICY "fee_plans admin only" ON public.fee_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- statements_imports
DROP POLICY IF EXISTS "imports open" ON public.statements_imports;
DROP POLICY IF EXISTS "imports authenticated only" ON public.statements_imports;
CREATE POLICY "imports admin only" ON public.statements_imports FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- transactions
DROP POLICY IF EXISTS "transactions open" ON public.transactions;
DROP POLICY IF EXISTS "transactions authenticated only" ON public.transactions;
CREATE POLICY "transactions admin only" ON public.transactions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- expenses_adjustments
DROP POLICY IF EXISTS "expenses open" ON public.expenses_adjustments;
DROP POLICY IF EXISTS "expenses authenticated only" ON public.expenses_adjustments;
CREATE POLICY "expenses admin only" ON public.expenses_adjustments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- closures
DROP POLICY IF EXISTS "closures open" ON public.closures;
DROP POLICY IF EXISTS "closures authenticated only" ON public.closures;
CREATE POLICY "closures admin only" ON public.closures FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- split_rules
DROP POLICY IF EXISTS "splits open" ON public.split_rules;
DROP POLICY IF EXISTS "splits authenticated only" ON public.split_rules;
CREATE POLICY "splits admin only" ON public.split_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- notifications
DROP POLICY IF EXISTS "Enable all access for notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications authenticated only" ON public.notifications;
CREATE POLICY "notifications admin only" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- asaas_settings
REVOKE ALL ON public.asaas_settings FROM anon;
DROP POLICY IF EXISTS "asaas_settings open" ON public.asaas_settings;
DROP POLICY IF EXISTS "asaas_settings authenticated only" ON public.asaas_settings;
CREATE POLICY "asaas_settings admin only" ON public.asaas_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- asaas_webhook_events
REVOKE ALL ON public.asaas_webhook_events FROM anon;
DROP POLICY IF EXISTS "asaas_webhook_events open" ON public.asaas_webhook_events;
DROP POLICY IF EXISTS "asaas_webhook_events authenticated only" ON public.asaas_webhook_events;
CREATE POLICY "asaas_webhook_events admin only" ON public.asaas_webhook_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- transaction_brands
REVOKE ALL ON public.transaction_brands FROM anon;
DROP POLICY IF EXISTS "transaction_brands open" ON public.transaction_brands;
DROP POLICY IF EXISTS "transaction_brands authenticated only" ON public.transaction_brands;
CREATE POLICY "transaction_brands admin only" ON public.transaction_brands FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
