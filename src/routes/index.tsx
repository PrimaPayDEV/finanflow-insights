import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Store,
  ShieldCheck,
  Building2,
  ArrowRight,
  ExternalLink,
  Lock,
  Globe,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AsaasBaasSeal } from "@/components/AsaasBaasSeal";
import { useAuth } from "@/contexts/AuthContext";
import {
  resolvePlatformUrl,
  getPlatformShareableUrl,
  type PlatformKey,
} from "@/lib/environment";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prima | Hub de Serviços" },
      {
        name: "description",
        content:
          "Central de acesso aos ecossistemas de Estabelecimentos Comerciais, Proteção Veicular e Gestão Imobiliária.",
      },
      { property: "og:title", content: "Prima | Hub de Serviços" },
      {
        name: "description",
        content:
          "Plataformas especializadas com liquidação bancária automatizada e tecnologia Asaas BaaS.",
      },
    ],
  }),
  component: HubPage,
});

interface PlatformConfig {
  id: PlatformKey;
  title: string;
  subtitle: string;
  icon: typeof Store;
  gradient: string;
  glowColor: string;
  borderHover: string;
  buttonClass: string;
  badgeDomain: string;
  loginPath: string;
  directPath: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: "ec",
    title: "Estabelecimentos Comerciais",
    subtitle: "Gestão financeira",
    icon: Store,
    gradient: "from-purple-600 to-indigo-600",
    glowColor: "bg-purple-600",
    borderHover: "hover:border-purple-500/60 hover:shadow-purple-500/10",
    buttonClass: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500",
    badgeDomain: "/ec",
    loginPath: "/ec",
    directPath: "/dashboard",
  },
  {
    id: "veicular",
    title: "Proteção Veicular",
    subtitle: "Gestão de associados e veículos",
    icon: ShieldCheck,
    gradient: "from-emerald-600 to-teal-600",
    glowColor: "bg-emerald-600",
    borderHover: "hover:border-emerald-500/60 hover:shadow-emerald-500/10",
    buttonClass: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
    badgeDomain: "/veicular",
    loginPath: "/veicular",
    directPath: "/dashboard",
  },
  {
    id: "imobiliaria",
    title: "Imobiliárias",
    subtitle: "Gestão de locações e contratos",
    icon: Building2,
    gradient: "from-amber-600 to-orange-600",
    glowColor: "bg-amber-600",
    borderHover: "hover:border-amber-500/60 hover:shadow-amber-500/10",
    buttonClass: "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500",
    badgeDomain: "/imobiliaria",
    loginPath: "/imobiliaria",
    directPath: "/real-estate/charges",
  },
];

function HubPage() {
  const { user, companyName, role, segment, appMode, signOut } = useAuth();
  const navigate = useNavigate();

  const activeDashboardUrl = () => {
    if (segment === "IMOBILIARIA") return "/real-estate/charges";
    if (appMode === "billing") return "/dashboard";
    if (role === "merchant") return "/recebiveis/dashboard";
    return "/dashboard";
  };

  const copyShareableLink = (e: React.MouseEvent, platformId: PlatformKey, path: string) => {
    e.preventDefault();
    e.stopPropagation();
    const fullUrl = getPlatformShareableUrl(platformId, path);
    navigator.clipboard.writeText(fullUrl);
    toast.success("Link copiado para a área de transferência!", {
      description: fullUrl,
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans selection:bg-purple-500/30 selection:text-purple-200">
      {/* Imagem de fundo enviada pelo usuário com transparência futurista */}
      <div 
        className="absolute inset-0 bg-[url('/hub-bg.png')] bg-cover bg-center bg-no-repeat opacity-30 mix-blend-screen pointer-events-none" 
      />

      {/* Gradientes e iluminação ambiente sobrepostos */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#070b14]/70 via-[#070b14]/85 to-[#070b14] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-purple-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Barra superior no topo (Navbar) */}
      <header className="relative z-20 w-full border-b border-slate-800/80 bg-[#070b14]/75 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-4">
          {/* Logo da Prima no lugar de PrimaHub */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center transition-opacity hover:opacity-90">
              <img 
                src="/prima-logo.png" 
                alt="Prima" 
                className="h-8 sm:h-9 w-auto object-contain brightness-110" 
              />
            </Link>
            <span className="hidden sm:inline-block h-4 w-[1px] bg-slate-800" />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase text-slate-400 bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-700/50">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Hub de Serviços
            </span>
          </div>

          {/* Ações da direita: sem ícone de tema */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-slate-200 truncate max-w-[180px]">
                    {companyName || user.email}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium">Conectado</p>
                </div>
                <Button size="sm" asChild className="rounded-xl font-bold text-xs h-9 gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20">
                  <Link to={activeDashboardUrl()}>
                    <span>Meu Painel</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="rounded-xl text-xs h-9 border-slate-700 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 hover:text-white"
                >
                  Sair
                </Button>
              </div>
            ) : (
              <span className="text-xs text-slate-400 font-medium hidden sm:inline-flex items-center gap-1.5">
                <Lock className="size-3.5 text-slate-500" /> Acesso Seguro
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal do Hub */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center space-y-8 sm:space-y-10">

        {/* Grade dos 3 Cards Resumidos (Foco em Nomes e Ícones) */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto w-full">
          {PLATFORMS.map((platform, idx) => {
            const Icon = platform.icon;
            // Cada ambiente tem login próprio: o sub-link fixa o ambiente da aba e abre o login dele
            // (ou o painel, se esta aba já estiver logada nesse ambiente).
            const targetUrl = resolvePlatformUrl(platform.id, platform.loginPath);
            const isExternal = true;

            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 * (idx + 1) }}
                className="flex"
              >
                <div
                  className={`group relative flex flex-col justify-between w-full rounded-2xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-6 sm:p-7 transition-all duration-300 ${platform.borderHover} hover:bg-slate-900/85 hover:shadow-2xl hover:shadow-black/50 hover:-translate-y-1 overflow-hidden`}
                >
                  {/* Glow decorativo de fundo no hover */}
                  <div
                    className={`absolute -right-12 -top-12 size-36 rounded-full ${platform.glowColor} opacity-0 group-hover:opacity-15 transition-opacity duration-500 blur-2xl pointer-events-none`}
                  />

                  <div className="space-y-4">
                    {/* Topo do Card: Ícone e Botão/Badge de Link direto */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`size-12 rounded-2xl bg-gradient-to-br ${platform.gradient} text-white flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 shrink-0`}
                      >
                        <Icon className="size-6" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => copyShareableLink(e, platform.id, platform.loginPath)}
                        title="Clique para copiar o link direto de acesso deste ambiente"
                        className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-700/60 transition-all cursor-pointer group/badge"
                      >
                        <Globe className="size-3 text-slate-400 group-hover/badge:text-purple-400" />
                        <span>{platform.badgeDomain}</span>
                        <Copy className="size-2.5 text-slate-400 group-hover/badge:text-purple-300 ml-0.5 opacity-70 group-hover/badge:opacity-100" />
                      </button>
                    </div>

                    {/* Nome e Resumo */}
                    <div className="space-y-1">
                      <h2 className="text-lg font-bold text-white tracking-tight group-hover:text-purple-300 transition-colors">
                        {platform.title}
                      </h2>
                      <p className="text-xs text-slate-400 font-medium">
                        {platform.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Botões de Acesso e Abertura em Nova Aba */}
                  <div className="pt-5 mt-4 border-t border-slate-800/70 space-y-2">
                    <Button
                      asChild
                      className={`w-full h-10 rounded-xl font-bold text-xs gap-2 text-white ${platform.buttonClass} shadow-md group-hover:shadow-lg transition-all duration-300`}
                    >
                      <a href={targetUrl}>
                        <span>Acessar Plataforma</span>
                        <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </Button>

                    <div className="flex items-center gap-2 pt-0.5">
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white text-[11px] font-semibold transition-all"
                        title="Abrir este ambiente em uma nova aba para usar simultaneamente"
                      >
                        <span>Abrir em nova aba</span>
                        <ExternalLink className="size-3" />
                      </a>

                      <button
                        type="button"
                        onClick={(e) => copyShareableLink(e, platform.id, platform.loginPath)}
                        className="flex items-center justify-center size-8 rounded-lg bg-slate-800/70 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all shrink-0 cursor-pointer"
                        title="Copiar link direto"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>

                    <p className="text-[10px] text-center text-slate-400 font-medium">
                      Login independente nesta aba
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </section>

        {/* Faixa Sutil de Conformidade e Isolamento */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-[11px] text-slate-400 py-3 px-5 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-md max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Ambientes 100% Isolados</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div className="flex items-center gap-2">
            <Lock className="size-3.5 text-purple-400" />
            <span>Infraestrutura Bancária Asaas BaaS</span>
          </div>
        </div>
      </main>

      {/* Rodapé Institucional Escuro */}
      <footer className="relative z-20 border-t border-slate-800/80 bg-[#070b14]/75 backdrop-blur-xl py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <AsaasBaasSeal variant="branco" size="xs" />
            <span className="hidden sm:inline text-slate-700">•</span>
            <span className="text-[11px]">Ecossistema Multi-Plataforma Prima</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/public/privacy" className="hover:text-slate-200 transition-colors underline">
              Termos e Privacidade BaaS
            </Link>
            <span className="text-slate-700">•</span>
            <a href="tel:08000090037" className="hover:text-slate-200 transition-colors">
              Suporte Asaas: 0800 009 0037
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
