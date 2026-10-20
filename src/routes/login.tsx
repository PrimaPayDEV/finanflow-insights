import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Wallet, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { translateError } from "@/lib/translateError";
import { AsaasBaasSeal } from "@/components/AsaasBaasSeal";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Se já estiver logado, redireciona para a home
  if (user) {
    navigate({ to: "/" });
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error && error.message.includes("Invalid login credentials") && email === "contato@primapay.com.br") {
        // Fallback para ambiente gerenciado pelo Lovable: criar o admin automaticamente na primeira vez
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          toast.error("Não foi possível criar o usuário Admin inicial.");
          console.error(signUpError);
          return;
        }

        if (data?.session) {
          toast.success("Usuário Admin criado com sucesso!");
          navigate({ to: "/" });
        } else {
          toast.warning("Conta criada! O Supabase exige confirmação: verifique a caixa de entrada do email contato@primapay.com.br para confirmar a conta.");
        }
        return;
      }

      if (error) {
        toast.error(translateError(error.message));
        console.error("Login error:", error);
        return;
      }

      toast.success("Login realizado com sucesso!");
      navigate({ to: "/" });
    } catch (error) {
      toast.error("Ocorreu um erro inesperado.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.warning("Por favor, preencha seu email no campo acima para redefinir a senha.");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        toast.error(translateError(error.message));
        return;
      }
      toast.success("Enviamos as instruções de redefinição para o seu email!");
    } catch (error: any) {
      toast.error("Ocorreu um erro ao tentar redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-8 relative z-10"
      >
        <div className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25 mb-4">
            <Wallet className="size-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2 text-foreground">
            PrimaHub
          </h1>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Acesse sua conta
          </h2>
          <p className="mt-1.5 text-xs text-muted-foreground">
            Insira suas credenciais para gerenciar a plataforma
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6 rounded-2xl border border-border/80 bg-card p-8 shadow-card">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Endereço de Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="contato@primapay.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Senha
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs font-semibold text-primary hover:underline focus:outline-none"
                  tabIndex={-1}
                >
                  Esqueci a senha?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox 
                id="remember" 
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label
                htmlFor="remember"
                className="text-xs font-medium cursor-pointer text-muted-foreground"
              >
                Manter conectado nesta sessão
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-sm shadow-primary/25" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar na plataforma"
            )}
          </Button>

          <div className="pt-2 border-t border-border/60 flex flex-col items-center gap-2 text-center">
            <AsaasBaasSeal variant="auto" size="xs" />
            <p className="text-[10px] text-muted-foreground leading-tight max-w-xs">
              Serviços financeiros operados por{" "}
              <strong className="text-foreground font-semibold">
                Asaas Gestão Financeira IP S.A.
              </strong>
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <Link to="/public/privacy" className="hover:text-primary underline">
                Termos & Privacidade BaaS
              </Link>
              <span>•</span>
              <span>Res. 16/2025 BACEN</span>
            </div>
          </div>
        </form>

        <div className="text-center text-[11px] text-muted-foreground">
          Precisa de suporte financeiro Asaas? Ligue{" "}
          <a href="tel:08000090037" className="font-bold text-foreground hover:underline">
            0800 009 0037
          </a>
        </div>
      </motion.div>
    </div>
  );
}
