CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') IN ('contato@primapay.com.br', 'financeiro@primapay.com.br');
$$;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.user_company_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT company_id FROM public.company_users WHERE user_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.user_company_ids() TO authenticated, service_role;

DO $$
DECLARE t TEXT;
  tables TEXT[] := ARRAY['merchants','transactions','closures','expenses_adjustments','fee_plans','statements_imports','split_rules','notifications','asaas_settings','real_estate_properties','real_estate_owners','real_estate_tenants','real_estate_contracts','real_estate_charges'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
    EXECUTE format('CREATE POLICY "tenant_isolation" ON public.%I FOR ALL TO authenticated USING (public.is_platform_admin() OR company_id IN (SELECT public.user_company_ids())) WITH CHECK (public.is_platform_admin() OR company_id IN (SELECT public.user_company_ids()))', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "tenant_isolation" ON public.pos_terminals;
CREATE POLICY "tenant_isolation" ON public.pos_terminals FOR ALL TO authenticated
USING (public.is_platform_admin() OR merchant_id IN (SELECT id FROM public.merchants WHERE company_id IN (SELECT public.user_company_ids())))
WITH CHECK (public.is_platform_admin() OR merchant_id IN (SELECT id FROM public.merchants WHERE company_id IN (SELECT public.user_company_ids())));

DROP POLICY IF EXISTS "platform_admin_all" ON public.company_users;
CREATE POLICY "platform_admin_all" ON public.company_users FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_all" ON public.companies;
CREATE POLICY "platform_admin_all" ON public.companies FOR ALL TO authenticated
USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

NOTIFY pgrst, 'reload schema';