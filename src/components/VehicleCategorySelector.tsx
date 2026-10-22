import React from "react";
import { Car, Bus, Bike, Truck, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const VEHICLE_CATEGORIES = [
  {
    id: "Leves e utilitários",
    label: "Leves e utilitários",
    description: "Carros de passeio, SUVs e picapes leves",
    icon: Car,
    accent: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "Veículo pesado 3,5 até 11 ton e vans",
    label: "Veículo pesado 3,5 até 11 ton e vans",
    description: "Vans, furgões e caminhões 3,5t a 11t",
    icon: Bus,
    accent: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "Motocicleta",
    label: "Motocicleta",
    description: "Motos, scooters, ciclomotores e triciclos",
    icon: Bike,
    accent: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "Veículos pesados acima de 11 ton",
    label: "Veículos pesados acima de 11 ton",
    description: "Caminhões pesados, carretas e cavalos mecânicos",
    icon: Truck,
    accent: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20",
  },
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number]["id"];

interface VehicleCategorySelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  compact?: boolean;
}

export function VehicleCategorySelector({
  value,
  onChange,
  label = "Categoria do Veículo",
  required = true,
  compact = false,
}: VehicleCategorySelectorProps) {
  if (compact) {
    return (
      <div className="space-y-1">
        <Label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
          <span>{label}</span>
          {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {VEHICLE_CATEGORIES.map((cat) => {
            const isSelected = value === cat.id;
            const Icon = cat.icon;

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1.5 rounded-xl border text-left transition-all cursor-pointer select-none h-8",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary font-bold shadow-xs ring-1 ring-primary/40"
                    : "border-border/70 bg-card hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("size-3.5 shrink-0", isSelected ? "text-primary" : "text-muted-foreground")} />
                <span className="text-[11px] font-medium truncate">{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <span>{label}</span>
          {required && <span className="text-destructive">*</span>}
        </Label>
        <span className="text-[11px] text-muted-foreground font-medium">
          Selecione a categoria correspondente
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {VEHICLE_CATEGORIES.map((cat) => {
          const isSelected = value === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => onChange(cat.id)}
              className={cn(
                "group relative flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 cursor-pointer select-none",
                "hover:scale-[1.01] active:scale-[0.99]",
                isSelected
                  ? "border-primary bg-primary/8 shadow-xs ring-1 ring-primary/40 dark:bg-primary/15"
                  : "border-border/70 bg-card hover:bg-muted/40 hover:border-border text-foreground"
              )}
            >
              {/* Caixa de marcação (Checkbox visual) */}
              <div
                className={cn(
                  "size-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all duration-150",
                  isSelected
                    ? "bg-primary border-primary text-primary-foreground shadow-xs"
                    : "border-muted-foreground/40 bg-background group-hover:border-primary/60"
                )}
              >
                {isSelected && <Check className="size-3 stroke-[3]" />}
              </div>

              {/* Ícone de Categoria */}
              <div
                className={cn(
                  "size-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors",
                  isSelected
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-muted/60 border-border/50 text-muted-foreground group-hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
              </div>

              {/* Título e Subtítulo */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p
                    className={cn(
                      "text-xs font-bold leading-tight truncate",
                      isSelected ? "text-primary" : "text-foreground"
                    )}
                  >
                    {cat.label}
                  </p>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5 line-clamp-1">
                  {cat.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function VehicleCategoryBadge({
  category,
  size = "md",
  className,
}: {
  category?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const cat =
    VEHICLE_CATEGORIES.find((c) => c.id === category) || VEHICLE_CATEGORIES[0];
  const Icon = cat.icon;

  if (size === "sm") {
    return (
      <Badge
        variant="outline"
        className={cn(
          "gap-1 text-[10px] font-semibold py-0 px-1.5 h-5 rounded-md border",
          cat.accent,
          className
        )}
      >
        <Icon className="size-3" />
        <span className="truncate max-w-[130px]">{cat.label}</span>
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 text-[11px] font-semibold py-0.5 px-2 rounded-lg border",
        cat.accent,
        className
      )}
    >
      <Icon className="size-3.5" />
      <span>{cat.label}</span>
    </Badge>
  );
}
