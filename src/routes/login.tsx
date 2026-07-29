import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CircleDollarSign, Loader2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

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
        toast.error(`Erro ao logar: ${error.message}`);
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
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-sidebar-primary text-sidebar-primary-foreground shadow-lg mb-6">
            <CircleDollarSign className="size-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Acesse sua conta
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Insira suas credenciais para gerenciar a plataforma
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-6 rounded-xl border bg-card p-8 shadow-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
              <label htmlFor="password" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Senha
              </label>
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
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember" 
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer text-muted-foreground"
              >
                Manter logado
              </label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar na plataforma"
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
