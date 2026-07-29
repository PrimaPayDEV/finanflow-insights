import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Store,
  Upload,
  Receipt,
  FileCheck2,
  Settings,
  CircleDollarSign,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
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
  { to: "/expenses", label: "Despesas / Ajustes", icon: Receipt },
  { to: "/closures", label: "Fechamentos & Cobrança", icon: FileCheck2 },
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

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 md:flex",
          isCollapsed ? "w-20" : "w-64"
        )}
      >
        <div className="flex items-center justify-between px-5 py-6">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <CircleDollarSign className="size-5" />
            </span>
            {!isCollapsed && (
              <div className="leading-tight whitespace-nowrap">
                <p className="text-sm font-semibold">PrimaPay</p>
                <p className="text-xs text-sidebar-foreground/60">Gestão de ECs</p>
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

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-border bg-card/80 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 md:px-8">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
            
            <div className="flex items-center gap-4">
              {actions}
              
              <div className="flex items-center gap-2 pl-4 border-l">
                <ThemeToggle />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" className="relative rounded-full">
                      <Bell className="h-4 w-4" />
                      <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive" />
                      <span className="sr-only">Notificações</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">Bem-vindo(a)!</span>
                        <span className="text-xs text-muted-foreground">Você tem acesso ao novo design.</span>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
          
          <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:hidden">
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        
        <main className="flex-1 overflow-hidden px-5 py-6 md:px-8">
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
