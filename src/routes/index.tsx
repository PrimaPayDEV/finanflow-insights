import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Store,
  Car,
  Building2,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronRight,
  ExternalLink,
  Lock,
  Wallet,
  Users,
  Receipt,
  FileCheck2,
  CreditCard,
  QrCode,
  Award,
  KeyRound,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AsaasBaasSeal } from "@/components/AsaasBaasSeal";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PrimaHub | Central de Serviços e Gestão Integrada" },
      {
        name: "description",
        content:
          "Portal principal de acesso aos ecossistemas de Estabelecimentos Comerciais, Proteção Veicular (Planmais) e Gestão Imobiliária.",
      },
      { property: "og:title", content: "PrimaHub | Central de Serviços e Gestão Integrada" },
      {
        property: "og:description",
        content:
          "Três plataformas especializadas em uma única infraestrutura com liquidação bancária automatizada e tecnologia Asaas BaaS.",
      },
    ],
  }),
  component: HubPage,
});

const PLATFORMS = [
  {
    id: "ec",
    title: "Estabelecimentos Comerciais (ECs)",
    badge: "Gestão Financeira & Maquininhas",
    badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    icon: Store,
    gradient: "from-purple-600 via-indigo-600 to-indigo-800",
    borderHover: "hover:border-purple-500/50 hover:shadow-purple-500/10",
    tagline: "Taxas, Maquininhas e Conciliação",
    description:
      "Plataforma completa para conciliação contínua de cartões, auditoria de taxas (CPAG59/CPAG56), fechamentos mensais de extratos, apuração de economia e regras de split automático.",
    loginUrl: "/login?env=ec",
    directUrl: "/dashboard",
    features: [
      "Auditoria de taxas negociadas vs aplicadas (CPAG59 e CPAG56)",
      "Fechamento mensal consolidado e relatórios internos",
      "Split automático de recebíveis e controle de terminais POS",
      "Portal exclusivo do lojista para extratos e vendas",
    ],
    buttonText: "Acessar Plataforma de ECs",
    stats: "Auditoria • Conciliação • Split",
  },
  {
    id: "veicular",
    title: "Proteção Veicular (Planmais)",
    badge: "Planmais Benefícios Mútuos",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: Car,
    gradient: "from-emerald-600 via-teal-600 to-cyan-800",
    borderHover: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
    tagline: "Frotas, Vistorias e Certificados",
    description:
      "Gestão operacional de frotas protegidas, importação e sincronização com relatórios SGA Hinova, emissão automatizada de boletos, laudos de vistoria e certificados digitais com QR Code.",
    loginUrl: "/login?env=veicular",
    directUrl: "/vehicles",
    features: [
      "Dossiê completo do veículo, tabela FIPE e coberturas",
      "Certificado digital autenticado com QR Code verificável",
      "Gestão de mensalidades com disparo de boletos via WhatsApp",
      "Importação em lote SGA Hinova com validação de CPF e placas",
    ],
    buttonText: "Acessar Proteção Veicular",
    stats: "Frotas • Vistoria • Certificados",
  },
  {
    id: "imobiliaria",
    title: "Gestão Imobiliária",
    badge: "Soluções para Imobiliárias",
    badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    icon: Building2,
    gradient: "from-amber-600 via-orange-600 to-amber-800",
    borderHover: "hover:border-amber-500/50 hover:shadow-amber-500/10",
    tagline: "Locações, Aluguéis e Repasses",
    description:
      "Ecossistema de alta performance para imobiliárias: automação de contratos de locação, parcelamento de aluguéis no cartão, antecipação de recebíveis e repasse direto aos proprietários via Split.",
    loginUrl: "/login?env=imobiliaria",
    directUrl: "/real-estate/charges",
    features: [
      "Cadastro e controle de imóveis, inquilinos e proprietários",
      "Split bancário automatizado com liquidação para proprietários",
      "Antecipação de recebíveis de aluguel e parcelamento flexível",
      "Régua de cobrança automática e emissão de recibos",
    ],
    buttonText: "Acessar Módulo Imobiliário",
    stats: "Contratos • Split • Antecipação",
  },
];

function HubPage() {
  const { user, companyName, role, segment, appMode, signOut } = useAuth();

  // Determina a rota ativa recomendada se o usuário já estiver conectado
  const activeDashboardUrl = () => {
    if (segment === "IMOBILIARIA") return "/real-estate/charges";
    if (appMode === "billing") return "/vehicles";
    if (role === "merchant") return "/recebiveis/dashboard";
    return "/dashboard";
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative selection:bg-primary/20 selection:text-primary">
      {/* Background decorativo sutil com grid e luz ambiente */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:60px_60px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* Header Superior / Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-gradient-to-br from-primary to-indigo-600 text-primary-foreground flex items-center justify-center font-black shadow-md shadow-primary/20 shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-foreground">
                  PrimaHub
                </span>
                <Badge variant="outline" className="text-[10px] font-bold px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/5 hidden sm:inline-flex">
                  Central de Acesso
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Portal Unificado de Serviços e Gestão Integrada
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />

            {user ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden md:block">
                  <p className="text-xs font-bold text-foreground truncate max-w-[180px]">
                    {companyName || user.email}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Sessão Ativa</p>
                </div>
                <Button size="sm" asChild className="rounded-xl font-bold text-xs h-9 gap-1.5 shadow-sm">
                  <Link to={activeDashboardUrl()}>
                    <span>Ir para Meu Painel</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="rounded-xl text-xs h-9 hidden sm:inline-flex"
                >
                  Sair
                </Button>
              </div>
            ) : (
              <Button size="sm" asChild variant="outline" className="rounded-xl text-xs font-bold h-9 gap-1.5 border-border/80">
                <a href="#plataformas">
                  <span>Ver Ambientes</span>
                  <ChevronRight className="size-3.5" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-12 sm:space-y-16 relative z-10">
        {/* Banner do Hero */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold"
          >
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            <span>Ecossistema Prima • Hub de Acesso Unificado</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-[1.15]"
          >
            Escolha o ambiente da sua operação
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto"
          >
            Três plataformas especializadas, unificadas em uma única infraestrutura com tecnologia bancária
            automatizada, controle financeiro sob medida e alta disponibilidade.
          </motion.p>
        </section>

        {/* Grade dos 3 Cards de Plataformas */}
        <section id="plataformas" className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {PLATFORMS.map((platform, idx) => {
            const Icon = platform.icon;
            const targetUrl = user ? platform.directUrl : platform.loginUrl;

            return (
              <motion.div
                key={platform.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 * (idx + 1) }}
                className="flex"
              >
                <Card
                  className={`relative flex flex-col justify-between w-full rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xs p-6 sm:p-7 shadow-card transition-all duration-300 ${platform.borderHover} group overflow-hidden`}
                >
                  {/* Luz de fundo sutil no hover */}
                  <div
                    className={`absolute -right-20 -top-20 size-48 rounded-full bg-gradient-to-br ${platform.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 blur-2xl pointer-events-none`}
                  />

                  <div className="space-y-5">
                    {/* Topo do Card: Ícone e Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`size-14 rounded-2xl bg-gradient-to-br ${platform.gradient} text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 shrink-0`}
                      >
                        <Icon className="size-7" />
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${platform.badgeColor}`}
                      >
                        {platform.badge}
                      </Badge>
                    </div>

                    {/* Título e Descrição */}
                    <div className="space-y-2">
                      <h2 className="text-xl font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors">
                        {platform.title}
                      </h2>
                      <p className="text-xs text-muted-foreground leading-relaxed min-h-[56px]">
                        {platform.description}
                      </p>
                    </div>

                    {/* Lista de Recursos / Diferenciais */}
                    <div className="space-y-2.5 pt-2 border-t border-border/60">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Recursos inclusos:
                      </span>
                      <ul className="space-y-2">
                        {platform.features.map((feature, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2 text-xs text-foreground/90">
                            <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span className="text-[11px] leading-tight">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Ação / Botão de Acesso */}
                  <div className="pt-6 mt-4 border-t border-border/60 space-y-2">
                    <Button
                      asChild
                      className={`w-full h-11 rounded-2xl font-bold text-xs gap-2 text-white bg-gradient-to-r ${platform.gradient} shadow-md group-hover:shadow-lg transition-all duration-300`}
                    >
                      <Link to={targetUrl}>
                        <span>{platform.buttonText}</span>
                        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    </Button>

                    <div className="text-center">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {platform.stats}
                      </span>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </section>

        {/* Seção Informativa de Segurança e Infraestrutura */}
        <section className="rounded-3xl border border-border/80 bg-muted/20 p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center sm:text-left">
            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">Operação Bancária BaaS</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Contas de liquidação, emissão de cobranças e conciliação operadas em parceria com a infraestrutura Asaas IP.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Layers className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">Ambientes Independentes</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Cada segmento possui painéis, cadastros, relatórios e permissões 100% isolados para máxima organização.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="size-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Lock className="size-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-foreground">Conformidade e Sigilo</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Alinhado integralmente às diretrizes de proteção de dados, Resolução 16/2025 BACEN e segurança criptográfica.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé Institucional */}
      <footer className="border-t border-border/70 bg-card/60 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <AsaasBaasSeal variant="auto" size="xs" />
            <span className="hidden sm:inline">•</span>
            <span className="text-[11px]">PrimaHub • Ecossistema Multi-Plataforma</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/public/privacy" className="hover:text-primary transition-colors underline">
              Termos e Privacidade BaaS
            </Link>
            <span>•</span>
            <a href="tel:08000090037" className="hover:text-primary transition-colors">
              Suporte Asaas: 0800 009 0037
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
