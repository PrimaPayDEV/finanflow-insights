-- Migration: Persistir e sincronizar dias de vencimento (due_day) dos associados
-- Garante que o dia de vencimento seja unificado no banco de dados para todos os usuários e computadores.

-- 1. Garantir que a coluna due_day existe na tabela members com valor padrão 20
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS due_day integer DEFAULT 20;

-- 2. Atualizar os 6 associados específicos que possuem vencimento no dia 15
-- Identificados por CPF (numérico e formatado) e por nome
UPDATE public.members
SET due_day = 15
WHERE regexp_replace(document, '\D', '', 'g') IN (
  '07255890607', -- Julio Cesar Ferreira
  '04475490650', -- LIDIONEZ COSTA SILVA
  '01353566608', -- LUCIANO ARLINDO DE JESUS
  '51823037687', -- Sebastiao de Rosario
  '13875213675', -- TCHARLE DO CARMO BATISTA
  '00423179675'  -- VIVIANE MICHELLINE VELOSO
)
OR document IN (
  '072.558.906-07',
  '044.754.906-50',
  '013.535.666-08',
  '518.230.376-87',
  '138.752.136-75',
  '004.231.796-75'
)
OR lower(name) ILIKE ANY(ARRAY[
  '%julio cesar ferreira%',
  '%lidionez costa silva%',
  '%luciano arlindo de jesus%',
  '%sebasti%de ros%rio%',
  '%tcharle do carmo batista%',
  '%viviane michelline velos%'
]);

-- 3. Todos os demais associados com due_day nulo são preenchidos com o vencimento padrão (dia 20)
UPDATE public.members
SET due_day = 20
WHERE due_day IS NULL;
