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
  tone?: "default" | "success" | "primary";
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 truncate text-2xl font-bold tracking-tight",
              tone === "success" && "text-success",
              tone === "primary" && "text-primary",
            )}
          >
            {value}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {trend && (
              <span
                className={cn(
                  "flex items-center text-xs font-medium",
                  trend === "up" && "text-success",
                  trend === "down" && "text-destructive",
                  trend === "neutral" && "text-muted-foreground",
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
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone === "success"
              ? "bg-success/10 text-success"
              : tone === "primary"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-5" />
        </span>
      </CardContent>
    </Card>
  );
}
