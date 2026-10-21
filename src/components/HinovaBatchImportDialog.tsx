import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileSpreadsheet,
  CheckCircle2,
  Users,
  Car,
  Truck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { importBatchMembers } from "@/lib/members.functions";
import { VehicleCategoryBadge } from "@/components/VehicleCategorySelector";
import { formatPlate } from "@/routes/vehicles";
import { formatCpfCnpj } from "@/lib/format";

// Dados extraídos diretamente do Relatório Hinova SGA / Planmais Proteção Veicular (Lote 89)
export const HINOVA_SGA_IMPORT_DATA = [
  {
    name: "NEDE BARÇANTE",
    document: "86916254653",
    phone: "",
    email: "",
    vehicle: {
      plate: "HBZ2327",
      brand: "Volkswagen",
      model: "KOMBI STANDARD 1.4 TOTAL FLEX 8V",
      year: 2010,
      category: "Leves e utilitários",
      color: "Branco",
      fipeValue: 34800,
    },
  },
  {
    name: "MARCOS SILVA CUNHA",
    document: "87053012620",
    phone: "(31) 98479-9192",
    email: "",
    vehicle: {
      plate: "PVU5837",
      brand: "Volkswagen",
      model: "FOX COMFORTLINE 1.6 FLEX 8V 5P",
      year: 2015,
      category: "Leves e utilitários",
      color: "Prata",
      fipeValue: 45900,
    },
  },
  {
    name: "SHIRLEI APARECIDA BOTARO",
    document: "04452049664",
    phone: "(31) 98783-2238",
    email: "",
    vehicle: {
      plate: "HOJ5A44",
      brand: "Fiat",
      model: "UNO VIVACE/RUA 1.0 EVO FIRE FLEX 8V 5P",
      year: 2011,
      category: "Leves e utilitários",
      color: "Cinza",
      fipeValue: 27500,
    },
  },
  {
    name: "GERALDO MARTINS JUNIOR",
    document: "17316118890",
    phone: "(31) 98831-9910",
    email: "",
    vehicle: {
      plate: "PZQ9A56",
      brand: "Mitsubishi",
      model: "L200 TRITON GLX 3.2 CD TB INT.DIESEL MEC",
      year: 2018,
      category: "Leves e utilitários",
      color: "Branco",
      fipeValue: 118000,
    },
  },
  {
    name: "LEONARDO FERNANDES MAPA",
    document: "14308283663",
    phone: "",
    email: "jca@gmail.com",
    vehicle: {
      plate: "GFI4I89",
      brand: "Volkswagen",
      model: "VIRTUS COMFORT. 200 TSI 1.0 FLEX 12V AUT",
      year: 2018,
      category: "Leves e utilitários",
      color: "Prata",
      fipeValue: 78500,
    },
  },
  {
    name: "OSMAR ALVES DA SILVA",
    document: "65182650604",
    phone: "(37) 99968-7190",
    email: "osmarvendas@yahoo.com.br",
    vehicle: {
      plate: "SRB3F45",
      brand: "BYD",
      model: "YUAN PLUS",
      year: 2024,
      category: "Leves e utilitários",
      color: "Cinza",
      fipeValue: 189000,
    },
  },
  {
    name: "LUCIANO ULTIMO DE PAULA",
    document: "09241069643",
    phone: "(31) 97164-9172",
    email: "",
    vehicle: {
      plate: "LMA5B66",
      brand: "Mercedes-Benz",
      model: "SPRINTER 415 FURGAO T.ALTO 2.2 DIES",
      year: 2014,
      category: "Veículo pesado 3,5 até 11 ton e vans",
      color: "Branco",
      fipeValue: 135000,
    },
  },
  {
    name: "LUCIANO ULTIMO DE PAULA",
    document: "09241069643",
    phone: "(31) 97164-9172",
    email: "",
    vehicle: {
      plate: "OQG6A76",
      brand: "Mercedes-Benz",
      model: "I/M.BENZ TAKO SPRINM 16",
      year: 2013,
      category: "Veículo pesado 3,5 até 11 ton e vans",
      color: "Branco",
      fipeValue: 128000,
    },
  },
];

export function HinovaBatchImportDialog({
  triggerText = "Importar Lote Hinova (8)",
  className,
}: {
  triggerText?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { companyId } = useAuth();
  const qc = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada no sistema.");

      const result = await importBatchMembers({
        data: {
          companyId,
          items: HINOVA_SGA_IMPORT_DATA,
        },
      });

      return result;
    },
    onSuccess: (res) => {
      toast.success(
        `Importação concluída! ${res.membersAdded} associados e ${res.vehiclesAdded} veículos cadastrados com sucesso.`
      );
      qc.invalidateQueries({ queryKey: ["members", companyId] });
      qc.invalidateQueries({ queryKey: ["vehicles", companyId] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      setOpen(false);
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao importar lote de associados.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={
            className ||
            "rounded-xl border-dashed border-primary/50 text-primary hover:bg-primary/10 gap-2 font-bold shadow-xs text-xs h-9"
          }
        >
          <FileSpreadsheet className="size-4 text-emerald-600 dark:text-emerald-400" />
          <span>{triggerText}</span>
          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] px-1.5 py-0 h-4 font-extrabold">
            8
          </Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-card border-border shadow-2xl">
        <DialogHeader className="space-y-1.5 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <FileSpreadsheet className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                Importação do Relatório Planmais (SGA Hinova)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Dados consolidados com CPF, modelos, categorias e veículos verificados
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Resumo do Lote */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 py-3">
          <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-left">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
              <Users className="size-3.5 text-primary" />
              <span>Associados</span>
            </div>
            <p className="text-lg font-black text-foreground mt-0.5">7</p>
            <span className="text-[10px] text-muted-foreground">com CPF validado</span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-left">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
              <Car className="size-3.5 text-emerald-600" />
              <span>Veículos</span>
            </div>
            <p className="text-lg font-black text-foreground mt-0.5">8</p>
            <span className="text-[10px] text-muted-foreground">com placas nacionais</span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-left">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
              <Truck className="size-3.5 text-amber-600" />
              <span>Categorias</span>
            </div>
            <p className="text-lg font-black text-foreground mt-0.5">2</p>
            <span className="text-[10px] text-muted-foreground">6 Leves / 2 Vans</span>
          </div>

          <div className="p-3 rounded-2xl bg-muted/30 border border-border/50 text-left">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
              <ShieldCheck className="size-3.5 text-purple-600" />
              <span>Cotas SGA</span>
            </div>
            <p className="text-lg font-black text-foreground mt-0.5">57.00</p>
            <span className="text-[10px] text-muted-foreground">Rateio proporcional</span>
          </div>
        </div>

        {/* Informação / Destaque */}
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200 flex items-start gap-2.5">
          <Info className="size-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold">Vínculo Automático e Não-Duplicação</p>
            <p className="text-[11px] opacity-90">
              O associado <strong>Luciano Ultimo de Paula</strong> possui 2 veículos (Sprinter 415 e Sprinter 16), que serão automaticamente vinculados ao mesmo cadastro via CPF.
            </p>
          </div>
        </div>

        {/* Lista de Registros a Importar */}
        <div className="space-y-2 mt-2">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Lista de Veículos e Associados do Relatório:
          </p>

          <div className="space-y-2 max-h-[300px] overflow-y-auto overflow-x-hidden pr-1">
            {HINOVA_SGA_IMPORT_DATA.map((item, idx) => (
              <Card
                key={`${item.vehicle.plate}-${idx}`}
                className="p-3 rounded-2xl border border-border/70 bg-card hover:bg-muted/20 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-foreground text-xs sm:text-sm">
                      {item.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-4 border-border/80">
                      CPF: {formatCpfCnpj(item.document)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 text-muted-foreground text-[11px] flex-wrap">
                    {item.phone && <span>📞 {item.phone}</span>}
                    {item.email && <span>✉️ {item.email}</span>}
                  </div>

                  <div className="pt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-extrabold text-foreground px-2 py-0.5 rounded-md bg-muted/60 border border-border/60 text-xs">
                      {formatPlate(item.vehicle.plate)}
                    </span>
                    <span className="text-xs font-semibold text-foreground truncate">
                      {item.vehicle.brand} {item.vehicle.model} ({item.vehicle.year})
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <VehicleCategoryBadge category={item.vehicle.category} size="sm" />
                  <div className="size-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="size-3.5" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter className="border-t border-border/60 pt-4 mt-3 flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl text-xs h-9 w-full sm:w-auto"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            disabled={importMutation.isPending}
            onClick={() => importMutation.mutate()}
            className="rounded-xl bg-primary text-primary-foreground font-bold text-xs gap-2 shadow-md h-9 w-full sm:w-auto"
          >
            {importMutation.isPending ? (
              <span>Cadastrando...</span>
            ) : (
              <>
                <Sparkles className="size-3.5" />
                <span>Confirmar e Cadastrar 8 Veículos</span>
                <ArrowRight className="size-3.5" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
