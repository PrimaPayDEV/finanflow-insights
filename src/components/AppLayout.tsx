import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsQuery } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { applyCompanyTheme } from "@/lib/theme";
import {
  LayoutDashboard,
  Store,
  Upload,
  Receipt,
  FileCheck2,
  Settings,
  Wallet,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
  LogOut,
  FileBarChart2,
  CircleDollarSign,
  FileText,
  AlertCircle,
  ShieldCheck,
  Users,
  ArrowDownToLine,
  Home,
  UserCheck,
  FastForward,
  PiggyBank,
  CreditCard,
  Clock,
  Car,
  User,
  Palette,
  CheckCheck,
  LayoutGrid,
  ChevronDown,
  Menu,
  Sparkles,
  Calculator,
  Settings2,
  Award,
  AlertTriangle,
} from "lucide-react";
import { DEFAULT_PLATFORM_URLS, isLocalEnvironment } from "@/lib/environment";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { AsaasBaasSeal, AsaasBaasFooterDisclosure } from "./AsaasBaasSeal";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "./ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; section?: string };

export type SubNavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  description?: string;
};

export type TopNavItem = {
  label: string;
  to?: string;
  icon: typeof LayoutDashboard;
  children?: SubNavItem[];
};

const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/merchants", label: "Estabelecimentos", icon: Store },
  { to: "/import", label: "Importar Extrato", icon: Upload, section: "Cobranças" },
  { to: "/expenses", label: "Lançamentos", icon: Receipt, section: "Cobranças" },
  { to: "/closures", label: "Fechamentos", icon: FileCheck2, section: "Cobranças" },
  { to: "/reports", label: "Relatórios", icon: FileBarChart2, section: "Cobranças" },
  { to: "/settings/asaas", label: "Configuração Asaas", icon: Settings },
];

export function AppLayout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, companyId, companyName, role, appMode, segment, logoUrl, primaryColor, signOut } = useAuth();
  const isPlatformAdmin = companyName === "Prima Hub" || companyName === "PrimaPay" || role === "admin";
  
  useEffect(() => {
    applyCompanyTheme(primaryColor, companyName, appMode, segment);
  }, [primaryColor, companyName, appMode, segment]);
  
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery(notificationsQuery(companyId));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] })
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false).eq('company_id', companyId!);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] })
  });

  // Identificação do ambiente de Proteção Veicular
  const isVeicular =
    appMode === "billing" ||
    segment === "PROTECAO_VEICULAR" ||
    pathname.startsWith("/vehicles") ||
    pathname.startsWith("/members") ||
    pathname.startsWith("/veicular");

  // Estrutura de menus no topo para Proteção Veicular conforme especificação completa
  const veicularNavItems: TopNavItem[] = [
    {
      to: "/veicular/cotacao",
      label: "Iniciar Cotação",
      icon: Sparkles,
    },
    {
      to: "/members",
      label: "Associado",
      icon: Users,
    },
    {
      to: "/vehicles",
      label: "Veículo",
      icon: Car,
    },
    {
      label: "Cadastro",
      icon: Settings2,
      children: [
        {
          to: "/veicular/cadastros?tab=consultores",
          label: "Consultores",
          icon: UserCheck,
          description: "Cadastro de consultores e comissões",
        },
        {
          to: "/veicular/cadastros?tab=cotas",
          label: "Cota de Participação",
          icon: ShieldCheck,
          description: "Planilha de franquia por tipo de veículo",
        },
        {
          to: "/veicular/cadastros?tab=produtos",
          label: "Produtos por Veículo",
          icon: Award,
          description: "Planilha com produtos para cada categoria",
        },
      ],
    },
    {
      label: "Financeiro",
      icon: Receipt,
      children: [
        {
          to: "/veicular/financeiro?tab=lotes",
          label: "Lotes & Fechamento",
          icon: FileCheck2,
          description: "Parametrização por vencimento e conferência",
        },
        {
          to: "/veicular/financeiro?tab=boletos",
          label: "Gerenciar Boletos",
          icon: CircleDollarSign,
          description: "Baixa manual, cancelamento e emissão",
        },
        {
          to: "/veicular/financeiro?tab=rateio",
          label: "Rateio de Sinistros",
          icon: PiggyBank,
          description: "Acréscimo percentual na mensalidade",
        },
      ],
    },
    {
      to: "/veicular/eventos",
      label: "Evento",
      icon: AlertTriangle,
    },
    {
      to: "/veicular/relatorios",
      label: "Relatório",
      icon: FileBarChart2,
    },
    {
      to: "/veicular/termos",
      label: "Usuário/Termos",
      icon: FileText,
    },
  ];

  const isTopItemActive = (item: TopNavItem) => {
    if (item.to) {
      const cleanTo = item.to.split("?")[0];
      return cleanTo === "/" ? pathname === "/" : pathname.startsWith(cleanTo);
    }
    if (item.children) {
      return item.children.some((child) => {
        const cleanChild = child.to.split("?")[0];
        return pathname.startsWith(cleanChild);
      });
    }
    return false;
  };

  // Menu lateral para os demais ambientes (ECs e Imobiliária)
  let currentNav = [...nav];
  if (role === "merchant") {
    currentNav = [
      { to: "/recebiveis/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/recebiveis/vendas", label: "Recebíveis", icon: Store, section: "Gestão de Recebíveis" },
      { to: "/recebiveis/lancamentos", label: "Lançamentos", icon: Receipt, section: "Gestão de Recebíveis" },
      { to: "/recebiveis/extrato", label: "Extrato", icon: FileText, section: "Gestão de Recebíveis" },
      { to: "/recebiveis/pos", label: "Minhas POS", icon: Wallet, section: "Configurações" },
      { to: "/recebiveis/perfil", label: "Meu Cadastro", icon: Settings, section: "Configurações" },
    ];
  } else if (role === "partner") {
    currentNav = [{ to: "/reports", label: "Relatórios", icon: FileBarChart2 }];
  } else if (segment === "IMOBILIARIA") {
    currentNav = [
      { to: "/real-estate/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/real-estate/properties", label: "Imóveis", icon: Home, section: "Cadastros" },
      { to: "/real-estate/owners", label: "Proprietários", icon: UserCheck, section: "Cadastros" },
      { to: "/real-estate/tenants", label: "Inquilinos", icon: Users, section: "Cadastros" },
      { to: "/real-estate/contracts", label: "Contratos", icon: FileText, section: "Gestão" },
      { to: "/real-estate/charges", label: "Cobranças", icon: Receipt, section: "Gestão" },
      { to: "/real-estate/receipts", label: "Recebimentos", icon: CircleDollarSign, section: "Gestão" },
      { to: "/real-estate/advance", label: "Antecipação de Aluguel", icon: FastForward, section: "Financeiro" },
      { to: "/real-estate/resources", label: "Recursos para Imobiliária", icon: PiggyBank, section: "Financeiro" },
      { to: "/real-estate/installments", label: "Parcelamento de Aluguel", icon: CreditCard, section: "Financeiro" },
      { to: "/real-estate/requests", label: "Solicitações", icon: Clock, section: "Controle" },
      { to: "/reports", label: "Relatórios", icon: FileBarChart2, section: "Controle" },
    ];
    if (isPlatformAdmin) {
      currentNav.push({ to: "/admin/companies", label: "Administração", icon: ShieldCheck, section: "Administração" });
    }
  } else {
    currentNav.push({ to: "/admin/recebiveis/import", label: "Importar Vendas POS", icon: ArrowDownToLine, section: "Gestão de Recebíveis" });
    currentNav.push({ to: "/partners", label: "Parceiros", icon: Users, section: "Administração" });
    if (isPlatformAdmin) {
      currentNav.push({ to: "/admin/companies", label: "Administração", icon: ShieldCheck, section: "Administração" });
    }
  }
  currentNav.push({ to: "/", label: "Hub de Ambientes", icon: LayoutGrid, section: "Ecossistema" });

  // Componente reutilizável para a área de perfil e notificações da direita
  const RightActions = () => (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      <div className="hidden sm:block">
        <AsaasBaasSeal variant="auto" size="xs" />
      </div>

      <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-border/70">
        <ThemeToggle />

        {/* Dropdown de Notificações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="relative rounded-full border-border/50 hover:bg-muted/50 transition-colors">
              <Bell className={cn("h-4 w-4", unreadCount > 0 && "text-primary fill-primary/20")} />
              {unreadCount > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground z-10 border border-background shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive opacity-75 animate-ping" />
                </>
              )}
              <span className="sr-only">Notificações</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto rounded-2xl border border-border/80 shadow-card bg-card p-1.5">
            <div className="flex items-center justify-between px-2 pb-1 pt-2">
              <DropdownMenuLabel className="p-0 font-bold text-sm">Notificações</DropdownMenuLabel>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-1.5 rounded-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    markAllAsRead.mutate();
                  }}
                  disabled={markAllAsRead.isPending}
                >
                  <CheckCheck className="size-3.5" />
                  <span>Marcar como lidas</span>
                </Button>
              )}
            </div>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <DropdownMenuItem disabled>Nenhuma notificação</DropdownMenuItem>
            ) : (
              notifications.map(notification => (
                <DropdownMenuItem 
                  key={notification.id}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 cursor-pointer rounded-xl transition-colors focus:bg-muted focus:text-foreground",
                    !notification.is_read 
                      ? "bg-primary/5 dark:bg-primary/10 border-l-2 border-primary" 
                      : "border-l-2 border-transparent"
                  )}
                  onClick={() => {
                    if (!notification.is_read) markAsRead.mutate(notification.id);
                    navigate({ to: "/closures" });
                  }}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="shrink-0 mt-0.5">
                      {notification.type === 'payment' && <CircleDollarSign className="w-4 h-4 text-emerald-500" />}
                      {notification.type === 'closure' && <FileText className="w-4 h-4 text-blue-500" />}
                      {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-destructive" />}
                    </div>
                    <span className="text-sm font-medium leading-none">
                      {notification.title}
                    </span>
                    {!notification.is_read && <span className="ml-auto w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  {notification.description && (
                    <span className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {notification.description}
                    </span>
                  )}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Dropdown de Usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8 overflow-hidden ring-1 ring-border/80">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} style={{ objectFit: 'cover' }} />
                <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                  {user?.email?.substring(0, 2).toUpperCase() || "AD"}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl border border-border/80 shadow-card bg-card p-1.5">
            <DropdownMenuLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
              {role === 'admin' ? 'Administrador' : role === 'merchant' ? 'Lojista' : 'Usuário'}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="w-full cursor-pointer font-medium rounded-lg flex items-center gap-2.5 py-2 px-2.5">
                <User className="size-4 text-muted-foreground" />
                <span>Meu Perfil</span>
              </Link>
            </DropdownMenuItem>
            {role === 'admin' && (
              <DropdownMenuItem asChild>
                <Link to="/settings/appearance" className="w-full cursor-pointer font-medium rounded-lg flex items-center gap-2.5 py-2 px-2.5">
                  <Palette className="size-4 text-muted-foreground" />
                  <span>Personalizar Ambiente</span>
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem asChild>
              {!isLocalEnvironment() && typeof window !== "undefined" && window.location.origin !== DEFAULT_PLATFORM_URLS.hub ? (
                <a
                  href={DEFAULT_PLATFORM_URLS.hub}
                  className="w-full cursor-pointer font-medium rounded-lg flex items-center gap-2.5 py-2 px-2.5 text-primary hover:bg-muted"
                >
                  <LayoutGrid className="size-4 text-primary" />
                  <span>Hub de Ambientes</span>
                </a>
              ) : (
                <Link to="/" className="w-full cursor-pointer font-medium rounded-lg flex items-center gap-2.5 py-2 px-2.5 text-primary">
                  <LayoutGrid className="size-4 text-primary" />
                  <span>Hub de Ambientes</span>
                </Link>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={async () => {
                await signOut();
                if (typeof window !== "undefined" && !isLocalEnvironment() && window.location.origin !== DEFAULT_PLATFORM_URLS.hub) {
                  window.location.href = DEFAULT_PLATFORM_URLS.hub;
                } else {
                  navigate({ to: "/" });
                }
              }} 
              className="text-destructive focus:text-destructive cursor-pointer font-medium rounded-lg flex items-center gap-2.5 py-2 px-2.5"
            >
              <LogOut className="size-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  // -------------------------------------------------------------
  // LAYOUT 1: AMBIENTE DE PROTEÇÃO VEICULAR (MENU NO TOPO COM SUB-MENUS)
  // -------------------------------------------------------------
  if (isVeicular) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-slate-50/50 dark:bg-slate-950 relative print:overflow-visible print:h-auto">
        {/* Barra Superior de Navegação (Navbar no Topo) */}
        <header className="print:hidden sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-md">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            {/* Logo / Marca */}
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
                {logoUrl ? (
                  <img src={logoUrl} alt={companyName || "Logo"} className="h-8 w-auto max-w-[140px] object-contain" />
                ) : (
                  <>
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div className="leading-tight">
                      <p className="text-base font-extrabold tracking-tight line-clamp-1" style={{ fontFamily: '"Montserrat Arabic", Montserrat, sans-serif' }}>
                        {companyName === 'PrimaPay' ? 'Planmais' : (companyName || 'Proteção Veicular')}
                      </p>
                    </div>
                  </>
                )}
              </Link>
              <span className="hidden xl:inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/60 border border-border/60 px-2 py-0.5 rounded-full">
                Proteção Veicular
              </span>
            </div>

            {/* Menu no Topo no Desktop (Com estrutura para Sub-menus sem separação por seção) */}
            <nav className="hidden lg:flex items-center gap-1.5 flex-1 max-w-3xl ml-4">
              {veicularNavItems.map((item) => {
                const active = isTopItemActive(item);
                const hasChildren = item.children && item.children.length > 0;
                const Icon = item.icon;

                if (hasChildren) {
                  return (
                    <DropdownMenu key={item.label}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn(
                            "h-9 px-3 rounded-xl font-semibold text-xs gap-1.5 transition-all duration-150 group cursor-pointer",
                            active
                              ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                          )}
                        >
                          <Icon className="size-4 shrink-0" />
                          <span>{item.label}</span>
                          <ChevronDown className="size-3.5 opacity-60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        className="w-64 p-1.5 rounded-2xl border border-border/80 shadow-xl bg-popover/95 backdrop-blur-md"
                      >
                        {item.children!.map((child) => {
                          const cleanChildPath = child.to.split("?")[0];
                          const hasQuery = child.to.includes("?");
                          const queryParam = hasQuery ? child.to.split("?")[1] : "";
                          const isChildActive = hasQuery
                            ? pathname === cleanChildPath && typeof window !== "undefined" && window.location.search.includes(queryParam)
                            : pathname.startsWith(cleanChildPath);
                          const ChildIcon = child.icon;
                          return (
                            <DropdownMenuItem key={child.to} asChild className="p-0 focus:bg-transparent data-[highlighted]:bg-transparent">
                              <Link
                                to={child.to}
                                className={cn(
                                  "flex items-start gap-3 p-2.5 rounded-xl transition-all cursor-pointer w-full text-left group",
                                  isChildActive
                                    ? "bg-primary/10 text-primary font-bold"
                                    : "text-foreground hover:bg-primary/10 hover:text-primary focus:bg-primary/10 focus:text-primary"
                                )}
                              >
                                <span
                                  className={cn(
                                    "flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5 transition-colors",
                                    isChildActive
                                      ? "bg-primary text-primary-foreground shadow-xs"
                                      : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                                  )}
                                >
                                  <ChildIcon className="size-4" />
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold leading-tight truncate group-hover:text-primary transition-colors">{child.label}</div>
                                  {child.description && (
                                    <p className="text-[11px] text-muted-foreground font-normal leading-tight mt-0.5 line-clamp-1 group-hover:text-primary/80 transition-colors">
                                      {child.description}
                                    </p>
                                  )}
                                </div>
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                return (
                  <Button
                    key={item.label}
                    variant="ghost"
                    size="sm"
                    asChild
                    className={cn(
                      "h-9 px-3 rounded-xl font-semibold text-xs gap-1.5 transition-all duration-150",
                      active
                        ? "bg-primary text-primary-foreground font-bold shadow-xs hover:bg-primary/90 hover:text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                    )}
                  >
                    <Link to={item.to!}>
                      <Icon className="size-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </nav>

            {/* Ações da direita e Gatilho Mobile */}
            <div className="flex items-center gap-2">
              <RightActions />

              {/* Botão do Menu Mobile (lg:hidden) */}
              <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden shrink-0 rounded-xl">
                    <Menu className="size-5" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0 bg-card border-r border-border flex flex-col justify-between">
                  <div className="flex flex-col">
                    <SheetHeader className="p-5 border-b border-border/60 text-left">
                      <SheetTitle className="text-base font-bold flex items-center gap-2">
                        <ShieldCheck className="size-5 text-primary" />
                        <span>Proteção Veicular</span>
                      </SheetTitle>
                    </SheetHeader>

                    {/* Lista de menus mobile sem separação por seção */}
                    <nav className="flex flex-col gap-1 p-3 overflow-y-auto max-h-[calc(100vh-140px)]">
                      {veicularNavItems.map((item) => {
                        const active = isTopItemActive(item);
                        const Icon = item.icon;

                        if (item.children) {
                          return (
                            <div key={item.label} className="flex flex-col gap-1 py-1">
                              <div className={cn(
                                "flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider",
                                active ? "text-primary" : "text-muted-foreground"
                              )}>
                                <Icon className="size-4" />
                                <span>{item.label}</span>
                              </div>
                              <div className="flex flex-col gap-1 pl-3 border-l-2 border-border/60 ml-4">
                                {item.children.map((child) => {
                                  const isChildActive = pathname.startsWith(child.to);
                                  const ChildIcon = child.icon;
                                  return (
                                    <Link
                                      key={child.to}
                                      to={child.to}
                                      onClick={() => setMobileNavOpen(false)}
                                      className={cn(
                                        "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                                        isChildActive
                                          ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                      )}
                                    >
                                      <ChildIcon className="size-4 shrink-0" />
                                      <span>{child.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        }

                        return (
                          <Link
                            key={item.label}
                            to={item.to!}
                            onClick={() => setMobileNavOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                              active
                                ? "bg-primary text-primary-foreground font-bold shadow-xs"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            <Icon className="size-4 shrink-0" />
                            <span>{item.label}</span>
                          </Link>
                        );
                      })}
                    </nav>
                  </div>

                  <div className="p-4 border-t border-border/60 flex flex-col items-center gap-2 bg-muted/20">
                    <AsaasBaasSeal variant="auto" size="xs" />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Sub-barra de Título da Página e Ações (Linha 2) */}
          {(title || actions) && (
            <div className="border-t border-border/50 bg-background/50 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
              <div className="truncate min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">{subtitle}</p>}
              </div>
              {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
          )}
        </header>

        {/* Conteúdo Principal Full-Width */}
        <main className="flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8 print:p-0 print:overflow-visible flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 print:h-auto print:overflow-visible"
            >
              {children}
            </motion.div>
          </AnimatePresence>

          <AsaasBaasFooterDisclosure />
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LAYOUT 2: DEMAIS AMBIENTES (ECS E IMOBILIÁRIA COM MENU LATERAL)
  // -------------------------------------------------------------
  return (
    <div className="flex min-h-screen w-full bg-slate-50/50 dark:bg-slate-950 relative print:overflow-visible print:h-auto">
      <aside
        className={cn(
          "relative z-20 print:hidden sticky top-0 hidden h-screen shrink-0 flex-col border-r border-sidebar-border/40 bg-sidebar text-sidebar-foreground transition-all duration-300 md:flex",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <div className="flex items-center gap-2 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName || "Logo"} className="h-8 w-auto max-w-[140px] object-contain" />
            ) : (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                  <Wallet className="size-5" />
                </span>
                {!isCollapsed && (
                  <div className="leading-tight">
                    <p className="text-lg md:text-xl font-extrabold tracking-tight line-clamp-2 break-words" style={{ fontFamily: '"Montserrat Arabic", Montserrat, sans-serif' }}>{companyName === 'PrimaPay' ? 'PrimaHub' : companyName}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <nav className="flex flex-1 flex-col px-3 overflow-y-auto overflow-x-hidden">
          {Object.entries(
            currentNav.reduce((acc, item) => {
              const s = item.section || "Geral";
              if (!acc[s]) acc[s] = [];
              acc[s].push(item);
              return acc;
            }, {} as Record<string, NavItem[]>)
          ).map(([section, items], sIdx) => (
            <div key={section} className={cn("flex flex-col mb-4", sIdx > 0 && "mt-2")}>
              {!isCollapsed && section !== "Geral" && (
                <h4 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {section}
                </h4>
              )}
              <div className="flex flex-col gap-1">
                {items.map((item) => {
                  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      title={isCollapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150 relative",
                        active
                          ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25 font-bold"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5",
                        isCollapsed && "justify-center px-0 hover:translate-x-0"
                      )}
                    >
                      <item.icon className="size-5 shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex flex-col gap-2 p-3 border-t border-sidebar-border/40">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex justify-center text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {isCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>

          {!isCollapsed ? (
            <div className="flex flex-col items-center gap-1.5 px-2 pb-1 pt-1 border-t border-sidebar-border/30">
              <AsaasBaasSeal variant="auto" size="xs" />
              <p className="text-[10px] text-center text-sidebar-foreground/60 leading-tight">
                Operações financeiras via Asaas
              </p>
            </div>
          ) : (
            <div className="flex justify-center pb-1" title="Serviços financeiros operados pelo Asaas">
              <AsaasBaasSeal variant="auto" size="xs" className="scale-75 origin-center" />
            </div>
          )}
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col print:overflow-visible print:h-auto">
        <header className="print:hidden sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 px-3 py-3.5 md:px-5 lg:px-6">
            <div className="flex items-center gap-3 overflow-hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                    <PanelLeftOpen className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border/40">
                  <div className="flex items-center gap-2 overflow-hidden px-5 py-6">
                    {logoUrl ? (
                      <img src={logoUrl} alt={companyName || "Logo"} className="h-8 w-auto max-w-[140px] object-contain" />
                    ) : (
                      <>
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                          <Wallet className="size-5" />
                        </span>
                        <div className="leading-tight">
                          <p className="text-lg font-extrabold tracking-tight line-clamp-2 break-words" style={{ fontFamily: '"Montserrat Arabic", Montserrat, sans-serif' }}>{companyName === 'PrimaPay' ? 'PrimaHub' : companyName}</p>
                        </div>
                      </>
                    )}
                  </div>
                  <nav className="flex flex-1 flex-col px-3 overflow-y-auto">
                    {Object.entries(
                      currentNav.reduce((acc, item) => {
                        const s = item.section || "Geral";
                        if (!acc[s]) acc[s] = [];
                        acc[s].push(item);
                        return acc;
                      }, {} as Record<string, NavItem[]>)
                    ).map(([section, items], sIdx) => (
                      <div key={section} className={cn("flex flex-col mb-4", sIdx > 0 && "mt-2")}>
                        {section !== "Geral" && (
                          <h4 className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                            {section}
                          </h4>
                        )}
                        <div className="flex flex-col gap-1">
                          {items.map((item) => {
                            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                            return (
                              <Link
                                key={item.to}
                                to={item.to}
                                className={cn(
                                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-150",
                                  active
                                    ? "bg-primary text-primary-foreground shadow-xs shadow-primary/25 font-bold"
                                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                                )}
                              >
                                <item.icon className="size-5 shrink-0" />
                                <span className="truncate">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </nav>

                  <div className="p-4 border-t border-sidebar-border/40 flex flex-col items-center gap-2">
                    <AsaasBaasSeal variant="auto" size="xs" />
                    <p className="text-[10px] text-center text-sidebar-foreground/60 leading-tight">
                      Serviços financeiros prestados por Asaas
                    </p>
                  </div>
                </SheetContent>
              </Sheet>
              
              <div className="truncate">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-xs md:text-sm text-muted-foreground hidden sm:block truncate mt-0.5">{subtitle}</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
              {actions && <div className="hidden sm:block">{actions}</div>}
              <RightActions />
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden px-3 py-4 md:px-5 lg:px-6 print:p-0 print:overflow-visible flex flex-col justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex-1 print:h-auto print:overflow-visible"
            >
              {children}
            </motion.div>
          </AnimatePresence>

          <AsaasBaasFooterDisclosure />
        </main>
      </div>
    </div>
  );
}
