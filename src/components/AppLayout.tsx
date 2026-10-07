import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsQuery } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
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
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
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

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
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
  const { user, companyId, companyName, role, appMode, segment, logoUrl, signOut } = useAuth();
  
  const isPlatformAdmin = user?.email === "contato@primapay.com.br" || user?.email === "financeiro@primapay.com.br";
  
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery(notificationsQuery(companyId));
  const unreadCount = notifications.filter(n => !n.is_read).length;

  let currentNav = [...nav];
  
  // Filter for billing mode
  if (appMode === "billing") {
    currentNav = currentNav
      .filter(item => !["/merchants", "/import", "/closures", "/expenses"].includes(item.to));
    // Insert new billing-specific menus before reports
    currentNav.splice(1, 0, 
      { to: "/members", label: "Associados", icon: Users },
      { to: "/invoices", label: "Faturas", icon: Receipt }
    );
  }

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
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                        isCollapsed && "justify-center px-0"
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

        <div className="flex flex-col gap-2 p-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="w-full flex justify-center text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            {isCollapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
          </Button>
          {!isCollapsed && (
            <p className="px-2 pb-2 pt-1 text-xs text-center text-sidebar-foreground/50">
              Plataforma de fechamento e cobrança
            </p>
          )}
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col print:overflow-visible print:h-auto">
        <header className="print:hidden sticky top-0 z-10 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2 px-3 py-3 md:px-8">
            <div className="flex items-center gap-2 overflow-hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden shrink-0">
                    <PanelLeftOpen className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-r-0">
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
                                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                                  active
                                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
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
                </SheetContent>
              </Sheet>
              
              <div className="truncate">
                <h1 className="text-lg md:text-xl font-semibold tracking-tight text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-sm text-muted-foreground hidden sm:block truncate">{subtitle}</p>}
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 sm:gap-4 shrink-0">
              {actions && <div className="hidden sm:block">{actions}</div>}
              
              <div className="flex items-center gap-3 pl-3 sm:pl-6 border-l shrink-0">
                <ThemeToggle />
                
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
                  <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 pb-1 pt-2">
                      <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
                      {unreadCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            markAllAsRead.mutate();
                          }}
                          disabled={markAllAsRead.isPending}
                        >
                          Marcar como lidas
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
                            "flex flex-col items-start gap-1 p-3 cursor-pointer transition-colors focus:bg-muted focus:text-foreground",
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

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="relative rounded-full h-8 w-8 overflow-hidden">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.user_metadata?.avatar_url} style={{ objectFit: 'cover' }} />
                        <AvatarFallback className="bg-primary/10 text-sm font-medium text-primary">
                          {user?.email?.substring(0, 2).toUpperCase() || "AD"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Administrador</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="w-full cursor-pointer font-medium">
                        Meu Perfil
                      </Link>
                    </DropdownMenuItem>
                    {role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link to="/settings/appearance" className="w-full cursor-pointer font-medium">
                          Personalizar Ambiente
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive cursor-pointer font-medium">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>
        
        <main className="flex-1 overflow-hidden px-3 py-4 md:px-8 print:p-0 print:overflow-visible">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full print:h-auto print:overflow-visible"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
