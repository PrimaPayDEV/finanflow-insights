-- Migration: Persistir mensalidades (monthly_fee) e dados complementares (extra_data) dos associados no Supabase
-- Garante paridade absoluta de mensalidades e dados de cadastro entre todos os computadores da equipe.

-- 1. Garantir que as colunas monthly_fee e extra_data existem na tabela members
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS monthly_fee numeric(10,2);
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS extra_data jsonb DEFAULT '{}'::jsonb;

-- 2. Atualizar os 6 associados com valores manuais fixados e dados de CNH
-- Julio Cesar Ferreira (CPF: 072.558.906-07) -> R$ 154,55, CNH AD Val: 09/03/2033
UPDATE public.members
SET 
  monthly_fee = 154.55,
  due_day = 15,
  extra_data = coalesce(extra_data, '{}'::jsonb) || '{"customMonthlyFee": 154.55, "cnhNumber": "00899319421", "cnhCategory": "AD", "cnhExpiryDate": "2033-03-09"}'::jsonb
WHERE regexp_replace(document, '\D', '', 'g') = '07255890607'
   OR lower(name) ILIKE '%julio cesar ferreira%';

-- LIDIONEZ COSTA SILVA (CPF: 044.754.906-50) -> R$ 316,67
UPDATE public.members
SET 
  monthly_fee = 316.67,
  due_day = 15,
  extra_data = coalesce(extra_data, '{}'::jsonb) || '{"customMonthlyFee": 316.67}'::jsonb
WHERE regexp_replace(document, '\D', '', 'g') = '04475490650'
   OR lower(name) ILIKE '%lidionez costa silva%';

-- LUCIANO ARLINDO DE JESUS (CPF: 013.535.666-08) -> R$ 194,17
UPDATE public.members
SET 
  monthly_fee = 194.17,
  due_day = 15,
  extra_data = coalesce(extra_data, '{}'::jsonb) || '{"customMonthlyFee": 194.17}'::jsonb
WHERE regexp_replace(document, '\D', '', 'g') = '01353566608'
   OR lower(name) ILIKE '%luciano arlindo de jesus%';

-- Sebastião de Rosário (CPF: 518.230.376-87) -> R$ 215,00
UPDATE public.members
SET 
  monthly_fee = 215.00,
  due_day = 15,
  extra_data = coalesce(extra_data, '{}'::jsonb) || '{"customMonthlyFee": 215.00}'::jsonb
WHERE regexp_replace(document, '\D', '', 'g') = '51823037687'
   OR lower(name) ILIKE '%sebasti%de ros%rio%';

-- TCHARLE DO CARMO BATISTA (CPF: 138.752.136-75) -> R$ 1.570,50
UPDATE public.members
SET 
  monthly_fee = 1570.50,
  due_day = 15,
  extra_data = coalesce(extra_data, '{}'::jsonb) || '{"customMonthlyFee": 1570.50}'::jsonb
WHERE regexp_replace(document, '\D', '', 'g') = '13875213675'
   OR lower(name) ILIKE '%tcharle do carmo batista%';

-- VIVIANE MICHELLINE VELOSO (CPF: 004.231.796-75) -> R$ 237,50
UPDATE public.members
SET 
  monthly_fee = 237.50,
  due_day = 15,
  extra_data = coalesce(extra_data, '{}'::jsonb) || '{"customMonthlyFee": 237.50}'::jsonb
WHERE regexp_replace(document, '\D', '', 'g') = '00423179675'
   OR lower(name) ILIKE '%viviane michelline velos%';

-- 3. Atualizar mensalidade dos demais associados que ainda estiverem com monthly_fee nulo
-- calculando pela soma das mensalidades dos seus veículos cadastrados
UPDATE public.members m
SET monthly_fee = coalesce(v_sum.total_fee, 179.90)
FROM (
  SELECT member_id, SUM(coalesce(monthly_fee, 179.90)) AS total_fee
  FROM public.vehicles
  GROUP BY member_id
) v_sum
WHERE m.id = v_sum.member_id AND m.monthly_fee IS NULL;
