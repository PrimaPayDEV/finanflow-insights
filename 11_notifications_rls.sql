-- Ativa o RLS na tabela de notificações
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Remove as políticas antigas, se existirem
DROP POLICY IF EXISTS "Usuários podem ver notificações da própria empresa" ON public.notifications;
DROP POLICY IF EXISTS "Usuários podem atualizar notificações da própria empresa" ON public.notifications;

-- Cria a política para restringir o acesso apenas para a company_id do usuário logado
CREATE POLICY "Usuários podem ver notificações da própria empresa"
ON public.notifications
FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM company_users
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem atualizar notificações da própria empresa"
ON public.notifications
FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM company_users
    WHERE user_id = auth.uid()
  )
);
