import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { read, utils } from "xlsx";
import { useState } from "react";
import { FileUp, CheckCircle2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { importsQuery, merchantsQuery, terminalsQuery } from "@/lib/db";
import { BRL, MODALITIES, currentMonth, modalityLabel, monthLabel, monthOptions, type Modality } from "@/lib/format";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Importar Extrato PrimaPay | Gestão de ECs" },
      {
        name: "description",
        content:
          "Faça upload do extrato PrimaPay em CSV, XLSX ou PDF, revise a prévia agrupada por modalidade e confirme a importação do faturamento.",
      },
      { property: "og:title", content: "Importar Extrato PrimaPay" },
      {
        property: "og:description",
        content: "Upload, parser por modalidade e identificação do EC pelo serial do POS.",
      },
    ],
  }),
  component: ImportPage,
});

type PreviewRow = {
  serial: string;
  modality: Modality;
  amount: number;
  date: string;
};

const MODALITY_ALIASES: Record<string, Modality> = {
  pix: "pix",
  debito: "debit",
  débito: "debit",
  debit: "debit",
  credito: "credit_vista",
  crédito: "credit_vista",
  credito_vista: "credit_vista",
  "credito a vista": "credit_vista",
  "crédito à vista": "credit_vista",
  credit_vista: "credit_vista",
  parcelado: "credit_installment",
  "credito parcelado": "credit_installment",
  "crédito parcelado": "credit_installment",
  credit_installment: "credit_installment",
  dinheiro: "cash",
  cash: "cash",
};

function parseSpreadsheet(data: ArrayBuffer): PreviewRow[] {
  const wb = read(data, { type: "array", cellDates: true });
  if (!wb.SheetNames.length) return [];
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[][] = utils.sheet_to_json(ws, { header: 1, defval: "" });
  
  if (rawRows.length < 2) return [];
  
  const header = rawRows[0].map(h => String(h).toLowerCase().trim());
  const idx = (names: string[]) => header.findIndex((h) => names.some((n) => h.includes(n)));
  
  const iSerial = idx(["número de série do cartão sim", "número de série", "serial", "pos", "terminal"]);
  const iMod = idx(["tipo de pagamento", "modalidade", "modality", "tipo", "bandeira"]);
  const iVal = idx(["valor líquido", "valor", "bruto", "amount"]);
  const iDate = idx(["data de captura", "data", "date"]);
  const iParcel = idx(["parcelamento"]);

  const rows: PreviewRow[] = [];
  for (const cols of rawRows.slice(1)) {
    if (!cols.some(c => String(c).trim())) continue;
    
    const rawMod = String(cols[iMod] ?? "").toLowerCase();
    
    let modality: Modality = "credit_vista";
    if (rawMod.includes("pix")) modality = "pix";
    else if (rawMod.includes("débito") || rawMod.includes("debito")) modality = "debit";
    else if (rawMod.includes("dinheiro") || rawMod.includes("cash")) modality = "cash";
    else if (rawMod.includes("crédito") || rawMod.includes("credito") || rawMod.includes("credit")) {
      const parcelInfo = String(cols[iParcel] ?? "").toLowerCase().trim();
      if (parcelInfo && parcelInfo !== "1" && parcelInfo !== "1x" && parcelInfo !== "0" && parcelInfo !== "não" && parcelInfo !== "nao" && parcelInfo !== "à vista" && parcelInfo !== "a vista") {
        modality = "credit_installment";
      } else {
        modality = "credit_vista";
      }
    } else {
      modality = "credit_vista";
    }

    let rawVal = cols[iVal];
    let amount = 0;
    if (typeof rawVal === "number") {
      amount = rawVal;
    } else {
      const cleaned = String(rawVal ?? "0").replace(/[R$\s.]/g, "").replace(",", ".");
      amount = Number(cleaned) || 0;
    }
    if (!amount) continue;

    let date = new Date().toISOString().slice(0, 10);
    const rawDate = cols[iDate];
    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      date = rawDate.toISOString().slice(0, 10);
    } else {
      const dateStr = String(rawDate ?? "").trim().split(" ")[0];
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [d, m, y] = dateStr.split("/");
        date = `${y}-${m}-${d}`;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        date = dateStr.slice(0, 10);
      }
    }

    rows.push({ serial: String(cols[iSerial] ?? "").trim(), modality, amount, date });
  }
  return rows;
}

function ImportPage() {
  const qc = useQueryClient();
  const merchants = useQuery(merchantsQuery);
  const terminals = useQuery(terminalsQuery);
  const imports = useQuery(importsQuery);

  const [merchantId, setMerchantId] = useState<string>("");
  const [month, setMonth] = useState(currentMonth());
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);

  const resolveMerchant = (serial: string) => {
    const t = (terminals.data ?? []).find((x) => x.serial_number === serial.trim());
    return t?.merchant_id ?? merchantId;
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseSpreadsheet(buffer);
      setRows(parsed);
      toast.success(`${parsed.length} lançamentos lidos da planilha`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao processar o arquivo. Verifique o formato.");
    }
  };

  const confirm = useMutation({
    mutationFn: async () => {
      const unresolved = rows.filter((r) => !resolveMerchant(r.serial));
      if (unresolved.length > 0) {
        throw new Error("Selecione um EC padrão ou vincule os seriais aos terminais.");
      }
      const { data: imp, error: impError } = await supabase
        .from("statements_imports")
        .insert({
          merchant_id: merchantId || null,
          file_name: fileName || "extrato-primapay",
          reference_month: month,
          status: "processing",
        })
        .select("id")
        .single();
      if (impError) throw new Error(impError.message);

      const payload = rows.map((r) => ({
        merchant_id: resolveMerchant(r.serial),
        pos_serial: r.serial,
        modality: r.modality,
        gross_amount: r.amount,
        transaction_date: new Date(`${r.date}T12:00:00`).toISOString(),
        import_id: imp.id,
      }));
      const { error } = await supabase.from("transactions").insert(payload);
      if (error) {
        await supabase.from("statements_imports").update({ status: "error" }).eq("id", imp.id);
        throw new Error(error.message);
      }
      await supabase.from("statements_imports").update({ status: "completed" }).eq("id", imp.id);
    },
    onSuccess: () => {
      toast.success("Importação concluída");
      setRows([]);
      setFileName("");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["imports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteImport = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("transactions").delete().eq("import_id", id);
      const { error } = await supabase.from("statements_imports").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Importação excluída com sucesso");
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["imports"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const totals = MODALITIES.map((m) => ({
    label: m.label,
    total: rows.filter((r) => r.modality === m.value).reduce((s, r) => s + r.amount, 0),
  })).filter((t) => t.total > 0);

  return (
    <AppLayout title="Importar Extrato" subtitle="Upload de extratos e conferência do faturamento">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload do extrato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>EC padrão (quando o serial não identificar)</Label>
                <Select value={merchantId} onValueChange={setMerchantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estabelecimento" />
                  </SelectTrigger>
                  <SelectContent>
                    {(merchants.data ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Mês de referência</Label>
                <Select value={month} onValueChange={setMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions().map((m) => (
                      <SelectItem key={m} value={m}>
                        {monthLabel(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 px-6 py-10 text-center transition-colors hover:bg-muted">
              <FileUp className="size-6 text-muted-foreground" />
              <span className="text-sm font-medium">
                {fileName || "Selecione o arquivo CSV, XLSX ou PDF"}
              </span>
              <span className="text-xs text-muted-foreground">
                Colunas esperadas no CSV: serial, modalidade, valor, data
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </label>

            {rows.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2">
                  {totals.map((t) => (
                    <Badge key={t.label} variant="secondary">
                      {t.label}: {BRL(t.total)}
                    </Badge>
                  ))}
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial POS</TableHead>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Valor bruto</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Input
                              value={r.serial}
                              placeholder="serial"
                              className="h-8 w-36 font-mono text-xs"
                              onChange={(e) => {
                                const next = [...rows];
                                next[i] = { ...r, serial: e.target.value };
                                setRows(next);
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={r.modality}
                              onValueChange={(v) => {
                                const next = [...rows];
                                next[i] = { ...r, modality: v as Modality };
                                setRows(next);
                              }}
                            >
                              <SelectTrigger className="h-8 w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MODALITIES.map((m) => (
                                  <SelectItem key={m.value} value={m.value}>
                                    {m.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-sm">{r.date}</TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {BRL(r.amount)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remover linha"
                              onClick={() => setRows(rows.filter((_, j) => j !== i))}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>
                  <CheckCircle2 className="size-4" /> Confirmar importação
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de importações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(imports.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma importação registrada.</p>
            )}
            {(imports.data ?? []).map((i) => (
              <div key={i.id} className="rounded-lg border border-border p-3 group relative">
                <div className="pr-8">
                  <p className="truncate text-sm font-medium">{i.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {monthLabel(i.reference_month)} ·{" "}
                    {(merchants.data ?? []).find((m) => m.id === i.merchant_id)?.name ?? "Multi-EC"}
                  </p>
                  <Badge className="mt-2" variant={i.status === "completed" ? "default" : "secondary"}>
                    {i.status === "completed"
                      ? "Concluída"
                      : i.status === "error"
                        ? "Erro"
                        : "Processando"}
                  </Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute right-2 top-2 h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja excluir esta importação e todas as suas transações?")) {
                      deleteImport.mutate(i.id);
                    }
                  }}
                  disabled={deleteImport.isPending}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Modalidades suportadas pelo parser: {MODALITIES.map((m) => modalityLabel(m.value)).join(", ")}.
      </p>
    </AppLayout>
  );
}
