-- Revert Platform Admin RLS Bypass to restore strict tenant isolation

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
        EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "tenant_isolation" ON public.%I FOR ALL USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id())', t);
    END LOOP;
END $$;

-- Restore Companies Policy
DROP POLICY IF EXISTS "tenant_isolation" ON public.companies;
CREATE POLICY "tenant_isolation" ON public.companies FOR SELECT USING (id = public.current_company_id());

-- Drop the helper function
DROP FUNCTION IF EXISTS public.is_platform_admin();

NOTIFY pgrst, 'reload schema';
