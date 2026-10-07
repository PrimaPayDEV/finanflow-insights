-- Real Estate Module Migration

-- 1. Properties
CREATE TABLE IF NOT EXISTS public.real_estate_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    internal_id TEXT,
    owner_id UUID, -- Will be referenced later
    status TEXT DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RENTED', 'INACTIVE')),
    additional_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Property Owners
CREATE TABLE IF NOT EXISTS public.real_estate_owners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    bank_details JSONB,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    documents JSONB,
    asaas_customer_id TEXT,
    asaas_wallet_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.real_estate_properties ADD CONSTRAINT real_estate_properties_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.real_estate_owners(id) ON DELETE SET NULL;

-- 3. Tenants
CREATE TABLE IF NOT EXISTS public.real_estate_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    document TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    documents JSONB,
    asaas_customer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Lease Contracts
CREATE TABLE IF NOT EXISTS public.real_estate_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES public.real_estate_owners(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES public.real_estate_tenants(id) ON DELETE RESTRICT,
    rent_amount NUMERIC(10, 2) NOT NULL,
    periodicity TEXT DEFAULT 'MONTHLY',
    due_day INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    admin_fee_type TEXT DEFAULT 'PERCENTAGE' CHECK (admin_fee_type IN ('PERCENTAGE', 'FIXED')),
    admin_fee_value NUMERIC(10, 2) NOT NULL,
    financial_rules JSONB,
    guarantees JSONB,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'DEFAULTED', 'FINISHED', 'CANCELLED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Rent Charges
CREATE TABLE IF NOT EXISTS public.real_estate_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES public.real_estate_contracts(id) ON DELETE RESTRICT,
    property_id UUID NOT NULL REFERENCES public.real_estate_properties(id) ON DELETE RESTRICT,
    owner_id UUID NOT NULL REFERENCES public.real_estate_owners(id) ON DELETE RESTRICT,
    tenant_id UUID NOT NULL REFERENCES public.real_estate_tenants(id) ON DELETE RESTRICT,
    competence TEXT NOT NULL, -- e.g. "2026-10"
    due_date DATE NOT NULL,
    gross_amount NUMERIC(10, 2) NOT NULL,
    admin_fee_amount NUMERIC(10, 2) NOT NULL,
    platform_fee_amount NUMERIC(10, 2) NOT NULL,
    owner_amount NUMERIC(10, 2) NOT NULL,
    expenses_amount NUMERIC(10, 2) DEFAULT 0,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'OVERDUE', 'RECEIVED', 'CANCELLED')),
    asaas_invoice_id TEXT,
    asaas_payment_url TEXT,
    split_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. RLS
ALTER TABLE public.real_estate_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.real_estate_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_properties" ON public.real_estate_properties FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tenant_isolation_owners" ON public.real_estate_owners FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tenant_isolation_tenants" ON public.real_estate_tenants FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tenant_isolation_contracts" ON public.real_estate_contracts FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));
CREATE POLICY "tenant_isolation_charges" ON public.real_estate_charges FOR ALL TO authenticated USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Notify
NOTIFY pgrst, 'reload schema';
