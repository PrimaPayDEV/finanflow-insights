import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Wallet,
  Loader2,
  Eye,
  EyeOff,
  ShieldCheck,
  Store,
  Car,
  Building2,
  ArrowLeft,
  Lock,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { translateError } from "@/lib/translateError";
import { AsaasBaasSeal } from "@/components/AsaasBaasSeal";

type EnvironmentKey = "ec" | "veicular" | "imobiliaria";

const ENV_META: Record<
  EnvironmentKey,
  {
    title: string;
    appName: string;
    shortTitle: string;
    subtitle: string;
    badgeLabel: string;
    icon: typeof Store;
    gradientClass: string;
    borderHighlight: string;
    badgeColor: string;
    redirectPath: string;
    placeholderEmail: string;
  }
> = {
  ec: {
    title: "Estabelecimentos Comerciais",
    appName: "Estabelecimentos Comerciais",
    shortTitle: "Ambiente ECs",
    subtitle: "Gestão financeira",
    badgeLabel: "Ambiente Estabelecimentos Comerciais",
    icon: Store,
    gradientClass: "from-purple-600 via-indigo-600 to-indigo-700",
    borderHighlight: "border-purple-500/30 shadow-purple-500/10",
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    redirectPath: "/dashboard",
    placeholderEmail: "contato@primapay.com.br",
  },
  veicular: {
    title: "Proteção Veicular",
    appName: "Proteção Veicular",
    shortTitle: "Proteção Veicular",
    subtitle: "Central de frotas protegidas, associados e emissão de certificados",
    badgeLabel: "Ambiente Proteção Veicular",
    icon: Car,
    gradientClass: "from-emerald-600 via-teal-600 to-cyan-700",
    borderHighlight: "border-emerald-500/30 shadow-emerald-500/10",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    redirectPath: "/vehicles",
    placeholderEmail: "gestao@protecaoveicular.com.br",
  },
  imobiliaria: {
    title: "Gestão Imobiliária",
    appName: "Gestão Imobiliária",
    shortTitle: "Imobiliária",
    subtitle: "Controle de contratos, emissão de aluguéis e repasses a proprietários",
    badgeLabel: "Ambiente Gestão Imobiliária",
    icon: Building2,
    gradientClass: "from-amber-600 via-orange-600 to-amber-700",
    borderHighlight: "border-amber-500/30 shadow-amber-500/10",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    redirectPath: "/real-estate/charges",
    placeholderEmail: "imobiliaria@primapay.com.br",
  },
};

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { env?: string } => ({
    env: typeof search.env === "string" ? search.env : undefined,
  }),
  component: Login,
});

function Login() {
  const search = Route.useSearch();
  const currentEnvKey = (search.env as EnvironmentKey) || undefined;
  const envConfig = currentEnvKey && ENV_META[currentEnvKey] ? ENV_META[currentEnvKey] : null;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user, role, segment, appMode } = useAuth();

  // Se já estiver logado, redireciona para a rota correta do ambiente
  if (user) {
    if (currentEnvKey === "veicular") {
      navigate({ to: "/vehicles" });
      return null;
    }
    if (currentEnvKey === "imobiliaria" || segment === "IMOBILIARIA") {
      navigate({ to: "/real-estate/charges" });
      return null;
    }
    if (role === "merchant") {
      navigate({ to: "/recebiveis/dashboard" });
      return null;
    }
    navigate({ to: "/dashboard" });
    return null;
  }

  const resolveRedirectPath = () => {
    if (envConfig) return envConfig.redirectPath;
    if (role === "merchant") return "/recebiveis/dashboard";
    if (segment === "IMOBILIARIA") return "/real-estate/charges";
    if (appMode === "billing") return "/vehicles";
    return "/dashboard";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error && error.message.includes("Invalid login credentials") && email === "contato@primapay.com.br") {
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
          const target = resolveRedirectPath();
          navigate({ to: target });
        } else {
          toast.warning("Conta criada! Verifique o e-mail contato@primapay.com.br para confirmar.");
        }
        return;
      }

      if (error) {
        toast.error(translateError(error.message));
        console.error("Login error:", error);
        return;
      }

      toast.success("Login realizado com sucesso!");
      const target = resolveRedirectPath();
      navigate({ to: target });
    } catch (error) {
      toast.error("Ocorreu um erro inesperado.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.warning("Por favor, preencha seu e-mail no campo acima para redefinir a senha.");
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
      toast.success("Enviamos as instruções de redefinição para o seu e-mail!");
    } catch (error: any) {
      toast.error("Ocorreu um erro ao tentar redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  const IconComponent = envConfig ? envConfig.icon : Wallet;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8 relative">
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] pointer-events-none" />

      {/* Botão de retorno ao Hub Principal */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between relative z-10">
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="rounded-xl text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60"
        >
          <Link to="/">
            <ArrowLeft className="size-3.5" />
            <span>Voltar ao Hub Principal</span>
          </Link>
        </Button>

        {envConfig && (
          <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${envConfig.badgeColor}`}>
            {envConfig.shortTitle}
          </Badge>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md space-y-6 relative z-10"
      >
        {/* Cabeçalho de Identidade Visual do Ambiente */}
        <div className="text-center space-y-2">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg ${
              envConfig ? `bg-gradient-to-br ${envConfig.gradientClass}` : "bg-primary shadow-primary/25"
            }`}
          >
            <IconComponent className="size-8" />
          </div>

          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {envConfig ? envConfig.appName : "Prima"}
            </h1>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              {envConfig ? envConfig.subtitle : "Acesse o ecossistema com suas credenciais de usuário"}
            </p>
          </div>

          {/* Atalho de troca rápida caso não haja ambiente definido ou queira alternar */}
          {!envConfig && (
            <div className="pt-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Selecione o Ambiente de Acesso:
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <Link
                  to="/login"
                  search={{ env: "ec" }}
                  className="p-2 rounded-xl border border-border/80 bg-card hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-center flex flex-col items-center gap-1"
                >
                  <Store className="size-4 text-purple-600" />
                  <span className="text-[10px] font-bold text-foreground">ECs</span>
                </Link>

                <Link
                  to="/login"
                  search={{ env: "veicular" }}
                  className="p-2 rounded-xl border border-border/80 bg-card hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-center flex flex-col items-center gap-1"
                >
                  <Car className="size-4 text-emerald-600" />
                  <span className="text-[10px] font-bold text-foreground">Planmais</span>
                </Link>

                <Link
                  to="/login"
                  search={{ env: "imobiliaria" }}
                  className="p-2 rounded-xl border border-border/80 bg-card hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-center flex flex-col items-center gap-1"
                >
                  <Building2 className="size-4 text-amber-600" />
                  <span className="text-[10px] font-bold text-foreground">Imobiliária</span>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Formulário de Login */}
        <form
          onSubmit={handleLogin}
          className={`space-y-5 rounded-2xl border bg-card p-6 sm:p-7 shadow-card transition-all ${
            envConfig ? envConfig.borderHighlight : "border-border/80"
          }`}
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Endereço de E-mail
              </label>
              <Input
                id="email"
                type="email"
                placeholder={envConfig ? envConfig.placeholderEmail : "seuemail@empresa.com.br"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 rounded-xl text-xs bg-background"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
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
                  className="w-full pr-10 h-10 rounded-xl text-xs bg-background"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-0.5">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <label htmlFor="remember" className="text-xs font-medium cursor-pointer text-muted-foreground">
                Manter conectado nesta sessão
              </label>
            </div>
          </div>

          <Button
            type="submit"
            className={`w-full h-10.5 rounded-xl font-bold text-xs shadow-md transition-all ${
              envConfig
                ? `bg-gradient-to-r ${envConfig.gradientClass} text-white hover:opacity-95 shadow-xs`
                : "bg-primary text-primary-foreground"
            }`}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Autenticando...
              </>
            ) : (
              `Entrar no ${envConfig ? envConfig.title : "PrimaHub"}`
            )}
          </Button>

          <div className="pt-2 border-t border-border/60 flex flex-col items-center gap-2 text-center">
            <AsaasBaasSeal variant="auto" size="xs" />
            <p className="text-[10px] text-muted-foreground leading-tight max-w-xs">
              Serviços financeiros operados por{" "}
              <strong className="text-foreground font-semibold">Asaas Gestão Financeira IP S.A.</strong>
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
