import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  trend,
  trendValue,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "primary" | "warning" | "destructive";
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card className="rounded-2xl border border-border/80 shadow-card bg-card hover:border-primary/40 hover:shadow-md transition-all duration-300 overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground truncate">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 truncate text-2xl sm:text-3xl font-extrabold tracking-tight",
              tone === "success" && "text-emerald-600 dark:text-emerald-400",
              tone === "primary" && "text-primary",
              tone === "warning" && "text-amber-600 dark:text-amber-400",
              tone === "destructive" && "text-rose-600 dark:text-rose-400",
              tone === "default" && "text-foreground",
            )}
          >
            {value}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold",
                  trend === "up" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  trend === "down" && "bg-destructive/10 text-destructive",
                  trend === "neutral" && "bg-muted text-muted-foreground",
                )}
              >
                {trend === "up" && <ArrowUpRight className="mr-0.5 size-3" />}
                {trend === "down" && <ArrowDownRight className="mr-0.5 size-3" />}
                {trend === "neutral" && <Minus className="mr-0.5 size-3" />}
                {trendValue}
              </span>
            )}
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </div>
        </div>
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-2xl border transition-colors shadow-2xs",
            tone === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : tone === "primary"
                ? "bg-primary/10 border-primary/20 text-primary"
                : tone === "warning"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                  : tone === "destructive"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                    : "bg-muted/80 border-border/60 text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
