-- Migration: Garantir acesso admin irrestrito aos e-mails oficiais PrimaPay
-- contato@primapay.com.br e financeiro@primapay.com.br

-- 1. Atualizar função public.is_staff para reconhecer administradores oficiais
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin'::public.app_role, 'staff'::public.app_role)
  ) OR EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = _user_id AND lower(email) IN ('contato@primapay.com.br', 'financeiro@primapay.com.br')
  );
$$;

-- 2. Atualizar função public.has_role para reconhecer administradores oficiais
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  ) OR (
    _role = 'admin'::public.app_role AND EXISTS (
      SELECT 1 FROM auth.users WHERE id = _user_id AND lower(email) IN ('contato@primapay.com.br', 'financeiro@primapay.com.br')
    )
  );
$$;

-- 3. Vincular usuários aos registros de company_users e user_roles
DO $$
DECLARE
  v_company_id uuid;
  v_user_contato uuid;
  v_user_financeiro uuid;
BEGIN
  -- Identificar ou criar empresa principal
  SELECT id INTO v_company_id FROM public.companies WHERE lower(name) LIKE '%prima%' LIMIT 1;
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;
  END IF;
  IF v_company_id IS NULL THEN
    INSERT INTO public.companies (name, is_active, app_mode)
    VALUES ('Prima Hub', true, 'full')
    RETURNING id INTO v_company_id;
  END IF;

  -- Obter usuário contato@primapay.com.br
  SELECT id INTO v_user_contato FROM auth.users WHERE lower(email) = 'contato@primapay.com.br' LIMIT 1;
  IF v_user_contato IS NOT NULL THEN
    -- Inserir / garantir em user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_contato, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    -- Inserir / garantir em company_users
    IF EXISTS (SELECT 1 FROM public.company_users WHERE user_id = v_user_contato AND company_id = v_company_id) THEN
      UPDATE public.company_users SET role = 'admin' WHERE user_id = v_user_contato AND company_id = v_company_id;
    ELSE
      INSERT INTO public.company_users (company_id, user_id, role)
      VALUES (v_company_id, v_user_contato, 'admin');
    END IF;
  END IF;

  -- Obter usuário financeiro@primapay.com.br
  SELECT id INTO v_user_financeiro FROM auth.users WHERE lower(email) = 'financeiro@primapay.com.br' LIMIT 1;
  IF v_user_financeiro IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_financeiro, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    IF EXISTS (SELECT 1 FROM public.company_users WHERE user_id = v_user_financeiro AND company_id = v_company_id) THEN
      UPDATE public.company_users SET role = 'admin' WHERE user_id = v_user_financeiro AND company_id = v_company_id;
    ELSE
      INSERT INTO public.company_users (company_id, user_id, role)
      VALUES (v_company_id, v_user_financeiro, 'admin');
    END IF;
  END IF;
END $$;

