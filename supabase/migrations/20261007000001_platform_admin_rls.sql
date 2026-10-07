-- Script to grant Platform Admins full access to all tables bypassing RLS

-- 1. Create the helper function
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT coalesce(auth.jwt() ->> 'email', '') IN ('contato@primapay.com.br', 'financeiro@primapay.com.br');
$$;

-- 2. Update all RLS policies to allow platform admins
DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'merchants', 'transactions', 'closures', 'expenses_adjustments', 
        'fee_plans', 'statements_imports', 'split_rules', 'notifications', 
        'asaas_settings', 'company_users', 'pos_terminals',
        'real_estate_properties', 'real_estate_owners', 'real_estate_tenants',
        'real_estate_contracts', 'real_estate_charges'
    ];
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        -- For most tables, we replace the "tenant_isolation" policy
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
        
        -- Special policies
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_companies" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_company_users" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_properties" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_owners" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_tenants" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_contracts" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_charges" ON public.%I', t);

        -- Create the new unified policy allowing BOTH tenant isolation AND platform admin access
        EXECUTE format('CREATE POLICY "tenant_isolation" ON public.%I FOR ALL USING (public.is_platform_admin() OR company_id = public.current_company_id() OR company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()))', t);
    END LOOP;
END $$;

-- 3. Fix Companies Policy (Companies uses id instead of company_id)
DROP POLICY IF EXISTS "tenant_isolation" ON public.companies;
CREATE POLICY "tenant_isolation" ON public.companies FOR ALL 
USING (public.is_platform_admin() OR id = public.current_company_id() OR id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
