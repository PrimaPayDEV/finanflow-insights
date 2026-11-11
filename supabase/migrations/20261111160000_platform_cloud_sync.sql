-- Migration: Tabela de sincronização universal em nuvem para garantir paridade total entre computadores
CREATE TABLE IF NOT EXISTS public.platform_cloud_cache (
  company_id text NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, cache_key)
);

ALTER TABLE public.platform_cloud_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "platform_cloud_cache_select" ON public.platform_cloud_cache;
CREATE POLICY "platform_cloud_cache_select" ON public.platform_cloud_cache FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "platform_cloud_cache_insert" ON public.platform_cloud_cache;
CREATE POLICY "platform_cloud_cache_insert" ON public.platform_cloud_cache FOR INSERT TO authenticated, anon WITH CHECK (true);

DROP POLICY IF EXISTS "platform_cloud_cache_update" ON public.platform_cloud_cache;
CREATE POLICY "platform_cloud_cache_update" ON public.platform_cloud_cache FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- Garantir coluna extra_data na tabela vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;

