import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { getTabScope, setTabScope, type SessionScope } from "@/lib/tab-session";

/**
 * Sub-link de um ambiente: fixa o ambiente desta aba e abre o login dele.
 * Se a aba estava em outro ambiente, recarrega para trocar de login sem
 * deslogar o outro ambiente nas demais abas.
 */
export function EnvironmentEntry({ env }: { env: SessionScope }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (getTabScope() !== env) {
      setTabScope(env);
      window.location.replace(`/login?env=${env}`);
      return;
    }
    setTabScope(env);
    navigate({ to: "/login", search: { env }, replace: true });
  }, [env, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
