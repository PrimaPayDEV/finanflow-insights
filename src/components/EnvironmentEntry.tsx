import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { getTabScope, setTabScope, type SessionScope } from "@/lib/tab-session";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Sub-link de um ambiente: fixa o ambiente desta aba e abre o login ou painel dele.
 * Se a aba estava em outro ambiente, recarrega para trocar o escopo de armazenamento
 * sem deslogar o outro ambiente nas demais abas.
 */
export function EnvironmentEntry({ env }: { env: SessionScope }) {
  const navigate = useNavigate();
  const { user, role, segment, isLoading } = useAuth();

  useEffect(() => {
    // Fixa o ambiente desta aba
    setTabScope(env);

    // Aguarda o término do carregamento da autenticação para checar a sessão real
    if (isLoading) return;

    // Se já estiver logado neste ambiente nesta aba, vai direto para o painel correspondente
    if (user) {
      if (env === "veicular") {
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      if (env === "imobiliaria" || segment === "IMOBILIARIA") {
        navigate({ to: "/real-estate/charges", replace: true });
        return;
      }
      if (role === "merchant") {
        navigate({ to: "/recebiveis/dashboard", replace: true });
        return;
      }
      navigate({ to: "/dashboard", replace: true });
      return;
    }

    // Se não estiver logado neste ambiente, abre a tela de login correspondente
    navigate({ to: "/login", search: { env }, replace: true });
  }, [env, navigate, user, role, segment, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
