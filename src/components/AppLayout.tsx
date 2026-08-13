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

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/merchants", label: "Estabelecimentos", icon: Store },
  { to: "/import", label: "Importar Extrato", icon: Upload },
  { to: "/expenses", label: "Despesas / Cobranças", icon: Receipt },
  { to: "/closures", label: "Fechamentos", icon: FileCheck2 },
  { to: "/reports", label: "Relatórios", icon: FileBarChart2 },
  { to: "/settings/asaas", label: "Configuração Asaas", icon: Settings },
] as const;

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
  const { user, signOut } = useAuth();
  
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: notifications = [] } = useQuery(notificationsQuery);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] })
  });

  const clearNotifications = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').delete().not('id', 'is', null);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] })
  });

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      {/* Background ambient light for premium feel */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[100px]" />
      </div>
      
      <aside
        className={cn(
          "relative z-20 print:hidden sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 md:flex",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Wallet className="size-5" />
            </span>
            {!isCollapsed && (
              <div className="leading-tight whitespace-nowrap">
                <p className="text-xl font-extrabold tracking-tight" style={{ fontFamily: '"Montserrat Arabic", Montserrat, sans-serif' }}>PrimaHub</p>
              </div>
            )}
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  isCollapsed && "justify-center px-0"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
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

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="print:hidden sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
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
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
                      <Wallet className="size-5" />
                    </span>
                    <div className="leading-tight whitespace-nowrap">
                      <p className="text-xl font-extrabold tracking-tight" style={{ fontFamily: '"Montserrat Arabic", Montserrat, sans-serif' }}>PrimaHub</p>
                    </div>
                  </div>
                  <nav className="flex flex-1 flex-col gap-1 px-3">
                    {nav.map((item) => {
                      const active =
                        item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
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
              
              <div className="flex items-center gap-1 pl-1.5 sm:pl-4 border-l shrink-0">
                <ThemeToggle />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="relative rounded-full">
                      <Bell className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
                      )}
                      <span className="sr-only">Notificações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 pb-1 pt-2">
                      <DropdownMenuLabel className="p-0">Notificações</DropdownMenuLabel>
                      {notifications.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-auto p-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            clearNotifications.mutate();
                          }}
                          disabled={clearNotifications.isPending}
                        >
                          Limpar todas
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
                          <div className="flex items-center gap-2 w-full">
                            <span className="text-sm font-medium leading-none">
                              {notification.type === 'payment' && '💰 '}
                              {notification.type === 'closure' && '📄 '}
                              {notification.type === 'error' && '⚠️ '}
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
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
