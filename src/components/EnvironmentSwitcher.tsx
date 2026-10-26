import React from "react";
import { Store, ShieldCheck, Building2, ExternalLink, Copy, Check, ChevronDown, Layers } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { getTabScope, type SessionScope } from "@/lib/tab-session";
import { resolvePlatformUrl, getPlatformShareableUrl } from "@/lib/environment";

interface EnvOption {
  id: SessionScope;
  title: string;
  shortName: string;
  path: string;
  icon: typeof Store;
  colorClass: string;
  badgeBg: string;
  badgeBorder: string;
  dotColor: string;
  desc: string;
}

const ENV_OPTIONS: EnvOption[] = [
  {
    id: "ec",
    title: "Estabelecimentos Comerciais",
    shortName: "Ambiente ECs",
    path: "/ec",
    icon: Store,
    colorClass: "text-purple-600 dark:text-purple-400",
    badgeBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    badgeBorder: "hover:border-purple-500/50",
    dotColor: "bg-purple-500",
    desc: "Gestão financeira, recebíveis e conciliação",
  },
  {
    id: "veicular",
    title: "Proteção Veicular",
    shortName: "Proteção Veicular",
    path: "/veicular",
    icon: ShieldCheck,
    colorClass: "text-emerald-600 dark:text-emerald-400",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    badgeBorder: "hover:border-emerald-500/50",
    dotColor: "bg-emerald-500",
    desc: "Central de associados, veículos e certificados",
  },
  {
    id: "imobiliaria",
    title: "Gestão Imobiliária",
    shortName: "Imobiliária",
    path: "/imobiliaria",
    icon: Building2,
    colorClass: "text-amber-600 dark:text-amber-400",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    badgeBorder: "hover:border-amber-500/50",
    dotColor: "bg-amber-500",
    desc: "Controle de locações, contratos e repasses",
  },
];

export function EnvironmentSwitcher() {
  const [copiedId, setCopiedId] = React.useState<SessionScope | null>(null);
  const currentScope = getTabScope() || "ec";
  const activeEnv = ENV_OPTIONS.find((e) => e.id === currentScope) || ENV_OPTIONS[0];
  const ActiveIcon = activeEnv.icon;

  const handleCopyLink = (e: React.MouseEvent, env: EnvOption) => {
    e.preventDefault();
    e.stopPropagation();
    const shareableUrl = getPlatformShareableUrl(env.id, env.path);
    navigator.clipboard.writeText(shareableUrl);
    setCopiedId(env.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success(`Link copiado: ${env.title}`, {
      description: shareableUrl,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 px-2.5 sm:px-3 rounded-xl border border-border/80 text-xs font-semibold gap-1.5 transition-all shadow-xs hover:bg-muted ${activeEnv.badgeBorder}`}
          title="Clique para ver os links e alternar ou abrir outros ambientes"
        >
          <span className={`size-2 rounded-full ${activeEnv.dotColor} animate-pulse`} />
          <ActiveIcon className={`size-3.5 ${activeEnv.colorClass}`} />
          <span className="hidden md:inline font-bold">{activeEnv.shortName}</span>
          <ChevronDown className="size-3 opacity-60 ml-0.5" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 p-2 rounded-2xl border border-border/80 shadow-2xl bg-card backdrop-blur-md"
      >
        <div className="px-2.5 py-2">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="size-3.5" />
            </div>
            <div>
              <DropdownMenuLabel className="p-0 text-xs font-bold leading-none">
                Ambientes com Login Independente
              </DropdownMenuLabel>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                Cada link roda com seu próprio login isolado. Abra em outra aba para usar ao mesmo tempo!
              </p>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <div className="space-y-1.5 py-1">
          {ENV_OPTIONS.map((env) => {
            const Icon = env.icon;
            const isCurrent = env.id === currentScope;
            const targetUrl = resolvePlatformUrl(env.id, env.path);
            const isCopied = copiedId === env.id;

            return (
              <div
                key={env.id}
                className={`flex flex-col gap-2 p-2.5 rounded-xl border transition-all ${
                  isCurrent
                    ? "bg-muted/60 border-border shadow-xs"
                    : "border-transparent hover:border-border/60 hover:bg-muted/30"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span
                      className={`flex size-8 shrink-0 items-center justify-center rounded-lg mt-0.5 ${
                        isCurrent
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground leading-tight truncate">
                          {env.title}
                        </span>
                        {isCurrent && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-4 font-bold bg-primary/15 text-primary border-primary/20"
                          >
                            Aba Atual
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                        {env.desc}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground/80 font-semibold">
                        Link: {env.path}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação para o Ambiente */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleCopyLink(e, env)}
                    className="h-7 text-[11px] px-2 rounded-lg gap-1 border-border/60 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                    title="Copiar link deste ambiente para abrir em outra aba"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3 text-emerald-500" />
                        <span className="text-emerald-500 font-semibold">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3" />
                        <span>Copiar link</span>
                      </>
                    )}
                  </Button>

                  <a
                    href={targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 h-7 text-[11px] px-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-semibold transition-colors cursor-pointer"
                    title="Abrir este ambiente em uma nova aba do navegador"
                  >
                    <span>Abrir em nova aba</span>
                    <ExternalLink className="size-3" />
                  </a>

                  {!isCurrent && (
                    <a
                      href={targetUrl}
                      className="ml-auto inline-flex items-center justify-center h-7 text-[11px] px-2.5 rounded-lg border border-border/80 hover:bg-muted text-foreground font-medium transition-colors"
                    >
                      <span>Alternar aba</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DropdownMenuSeparator />

        <div className="px-2.5 py-2 text-[10px] text-muted-foreground leading-relaxed bg-muted/30 rounded-xl mt-1">
          <strong className="text-foreground font-semibold">💡 Dica de uso simultâneo:</strong> Para usar o
          ambiente de ECs e o de Proteção Veicular ao mesmo tempo, clique em{" "}
          <span className="text-primary font-semibold">&ldquo;Abrir em nova aba&rdquo;</span>. O login de
          cada aba funcionará de forma independente sem derrubar a outra!
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
