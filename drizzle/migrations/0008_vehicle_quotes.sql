CREATE TABLE public.vehicle_quotes (
  id text PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicle_quotes TO authenticated;
GRANT ALL ON public.vehicle_quotes TO service_role;
ALTER TABLE public.vehicle_quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company members manage quotes" ON public.vehicle_quotes FOR ALL TO authenticated
USING (company_id IN (SELECT public.user_company_ids()) OR public.is_platform_admin())
WITH CHECK (company_id IN (SELECT public.user_company_ids()) OR public.is_platform_admin());