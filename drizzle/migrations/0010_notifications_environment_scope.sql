ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS environment text;
UPDATE public.notifications n SET environment = CASE WHEN lower(coalesce(c.segment, '')) IN ('protecao_veicular', 'proteção veicular') OR lower(c.name) = 'planmais' THEN 'veicular' WHEN lower(coalesce(c.segment, '')) = 'imobiliaria' THEN 'imobiliaria' ELSE 'ec' END FROM public.companies c WHERE c.id = n.company_id AND n.environment IS NULL;
UPDATE public.notifications SET environment = 'ec' WHERE environment IS NULL;
CREATE OR REPLACE FUNCTION public.assign_notification_environment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.environment IS NULL THEN
    SELECT CASE WHEN lower(coalesce(c.segment, '')) IN ('protecao_veicular', 'proteção veicular') OR lower(c.name) = 'planmais' THEN 'veicular' WHEN lower(coalesce(c.segment, '')) = 'imobiliaria' THEN 'imobiliaria' ELSE 'ec' END INTO NEW.environment FROM public.companies c WHERE c.id = NEW.company_id;
    NEW.environment := coalesce(NEW.environment, 'ec');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER assign_notification_environment BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.assign_notification_environment();
ALTER TABLE public.notifications ADD CONSTRAINT notifications_environment_check CHECK (environment IN ('ec', 'veicular', 'imobiliaria', 'recebiveis'));
CREATE INDEX IF NOT EXISTS notifications_company_environment_created_idx ON public.notifications(company_id, environment, created_at DESC);