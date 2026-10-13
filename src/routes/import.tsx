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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { importsQuery, merchantsQuery, terminalsQuery } from "@/lib/db";
import { BRL, MODALITIES, currentMonth, modalityLabel, monthLabel, monthOptions, type Modality } from "@/lib/format";
import { translateError } from "@/lib/translateError";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Importar Extrato PrimaHub | Gestão de ECs" },
      {
        name: "description",
        content:
          "Faça upload do extrato PrimaHub em CSV, XLSX ou PDF, revise a prévia agrupada por modalidade e confirme a importação do faturamento.",
      },
      { property: "og:title", content: "Importar Extrato PrimaHub" },
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
  netAmount: number | null;
  date: string;
  installments: number;
  brand: string;
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

function normalizeText(text: any): string {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos (líquido -> liquido)
    .replace(/[^a-z0-9]/g, " ")      // remove pontuações (vlr. -> vlr)
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(val: any): number | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  const str = String(val).trim();
  if (!str || str === "-" || str === "N/A" || str === "null" || str === "undefined") return null;

  // Formatos mistos com vírgula e ponto
  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // Padrão brasileiro: "1.234,56"
      const num = Number(str.replace(/[R$\s.]/g, "").replace(",", "."));
      return isNaN(num) ? null : num;
    } else {
      // Padrão internacional: "1,234.56"
      const num = Number(str.replace(/[R$\s,]/g, ""));
      return isNaN(num) ? null : num;
    }
  } else if (str.includes(",")) {
    // Padrão brasileiro sem milhar: "28,58"
    const num = Number(str.replace(/[R$\s]/g, "").replace(",", "."));
    return isNaN(num) ? null : num;
  } else {
    // Padrão com ponto ou inteiro: "28.58"
    const num = Number(str.replace(/[R$\s]/g, ""));
    return isNaN(num) ? null : num;
  }
}

function parseSpreadsheet(data: ArrayBuffer): PreviewRow[] {
  const wb = read(data, { type: "array", cellDates: true });
  if (!wb.SheetNames.length) return [];
  const ws = wb.Sheets[wb.SheetNames[0]];
  let rawRows: any[][] = utils.sheet_to_json(ws, { header: 1, defval: "" });
  
  if (rawRows.length < 2) return [];

  // Suporte a CSV separado por ponto e vírgula agrupado em uma só coluna
  if (rawRows.length > 0 && rawRows[0]?.length === 1 && String(rawRows[0][0]).includes(";")) {
    rawRows = rawRows.map((row) => {
      if (row.length === 1 && typeof row[0] === "string") {
        return row[0].split(";");
      }
      return row;
    });
  }

  // Detecta a linha do cabeçalho pesquisando nas primeiras 25 linhas
  let headerRowIndex = -1;
  for (let r = 0; r < Math.min(rawRows.length, 25); r++) {
    const rowNorm = (rawRows[r] || []).map(normalizeText);
    const hasDate = rowNorm.some((s) => s.includes("data") || s.includes("date"));
    const hasValue = rowNorm.some(
      (s) =>
        s.includes("valor") ||
        s.includes("vlr") ||
        s.includes("bruto") ||
        s.includes("liquido") ||
        s.includes("liq") ||
        s.includes("amount"),
    );
    const hasSerialOrMod = rowNorm.some(
      (s) =>
        s.includes("serial") ||
        s.includes("equipamento") ||
        s.includes("pos") ||
        s.includes("terminal") ||
        s.includes("modalidade") ||
        s.includes("bandeira") ||
        s.includes("produto") ||
        s.includes("tipo") ||
        s.includes("sn"),
    );

    if ((hasDate && hasValue) || (hasValue && hasSerialOrMod)) {
      headerRowIndex = r;
      break;
    }
  }

  if (headerRowIndex === -1) headerRowIndex = 0;

  const header = (rawRows[headerRowIndex] || []).map(normalizeText);

  const findCol = (keywords: string[], excludeIdx: number[] = []) => {
    for (const kw of keywords) {
      const idx = header.findIndex((h, i) => !excludeIdx.includes(i) && h.includes(kw));
      if (idx !== -1) return idx;
    }
    return -1;
  };

  // 1. Coluna de Valor Líquido (procurada prioritariamente)
  const iNetVal = findCol([
    "valor liquido",
    "vlr liquido",
    "vl liquido",
    "liquido",
    "valor liq",
    "vlr liq",
    "vl liq",
    "liq",
    "valor pago",
    "vlr pago",
    "vl pago",
    "valor creditado",
    "vlr creditado",
    "vl creditado",
    "valor a receber",
    "vlr a receber",
    "net amount",
    "net",
  ]);

  // 2. Coluna de Valor Bruto (exclui a coluna identificada como valor líquido)
  const iGrossVal = findCol(
    [
      "valor bruto",
      "vlr bruto",
      "vl bruto",
      "bruto",
      "valor venda",
      "vlr venda",
      "vl venda",
      "valor transacao",
      "vlr transacao",
      "vl transacao",
      "valor total",
      "vlr total",
      "vl total",
    ],
    iNetVal !== -1 ? [iNetVal] : [],
  );

  // Fallback para valor bruto se não tiver "bruto" explícito
  const finalIVal =
    iGrossVal !== -1
      ? iGrossVal
      : findCol(["valor", "vlr", "amount", "total"], iNetVal !== -1 ? [iNetVal] : []);

  // 3. Serial POS
  const iSerial = findCol([
    "sn equipamento",
    "numero de serie",
    "num serie",
    "n serie",
    "serial",
    "pos",
    "terminal",
    "equipamento",
    "sn",
  ]);

  // 4. Modalidade
  const iMod = findCol([
    "tipo de pagamento",
    "forma de pagamento",
    "forma pgto",
    "modalidade",
    "modality",
    "tipo",
    "produto",
    "meio de captura",
  ]);

  // 5. Bandeira
  const iBrand = findCol(["bandeira", "brand", "marca", "arranjo"]);

  // 6. Data
  const iDate = findCol([
    "data de captura",
    "data da transacao",
    "data transacao",
    "data venda",
    "data",
    "date",
  ]);

  // 7. Parcelamento
  const iParcel = findCol([
    "parcelamento",
    "parcelas",
    "parcela",
    "plano",
    "qtd parcelas",
    "quantidade de parcelas",
    "num parcelas",
  ]);

  const rows: PreviewRow[] = [];
  for (const cols of rawRows.slice(headerRowIndex + 1)) {
    if (!cols.some((c: any) => String(c).trim())) continue;

    const rawMod = normalizeText(cols[iMod] ?? "");

    let installments = 1;
    let modality: Modality = "credit_vista";
    if (rawMod.includes("pix")) modality = "pix";
    else if (rawMod.includes("debito") || rawMod.includes("debit")) modality = "debit";
    else if (rawMod.includes("dinheiro") || rawMod.includes("cash") || rawMod.includes("especie"))
      modality = "cash";
    else if (rawMod.includes("credito") || rawMod.includes("credit")) {
      const parcelInfo = normalizeText(cols[iParcel] ?? "");
      if (
        parcelInfo &&
        parcelInfo !== "1" &&
        parcelInfo !== "1x" &&
        parcelInfo !== "0" &&
        parcelInfo !== "nao" &&
        parcelInfo !== "a vista"
      ) {
        modality = "credit_installment";
        const match = parcelInfo.match(/\d+/);
        if (match) {
          installments = parseInt(match[0], 10) || 1;
        }
      } else {
        modality = "credit_vista";
      }
    } else {
      modality = "credit_vista";
    }

    const amount = parseMoney(cols[finalIVal]);
    if (!amount) continue;

    let netAmount: number | null = null;
    if (iNetVal !== -1) {
      netAmount = parseMoney(cols[iNetVal]);
    }

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

    let brand = "";
    if (iBrand !== -1) {
      brand = String(cols[iBrand] ?? "").trim();
    }

    rows.push({
      serial: String(cols[iSerial] ?? "").trim(),
      modality,
      amount,
      netAmount,
      date,
      installments,
      brand,
    });
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
  
  const [viewingImport, setViewingImport] = useState<{ id: string; name: string } | null>(null);
  const [viewingRows, setViewingRows] = useState<PreviewRow[]>([]);
  const [isLoadingView, setIsLoadingView] = useState(false);
  const [serialFilter, setSerialFilter] = useState<string>("all");
  const [historyMonthFilter, setHistoryMonthFilter] = useState<string>("all");

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
      toast.error(translateError("Erro ao processar o arquivo. Verifique o formato."));
    }
  };

  const loadImportView = async (imp: any) => {
    setIsLoadingView(true);
    try {
      const { data, error } = await supabase.from("transactions").select("*").eq("import_id", imp.id);
      if (error) throw error;
      const mapped: PreviewRow[] = (data || []).map((t) => ({
        serial: t.pos_serial || "",
        modality: t.modality as Modality,
        amount: Number(t.gross_amount),
        netAmount: t.net_amount !== null ? Number(t.net_amount) : null,
        date: String(t.transaction_date).slice(0, 10),
        installments: t.installments || 1,
        brand: t.brand || "",
      }));
      setViewingRows(mapped);
      setViewingImport({ id: imp.id, name: imp.file_name });
    } catch (err) {
      toast.error(translateError("Erro ao carregar os dados desta importação"));
    } finally {
      setIsLoadingView(false);
    }
  };

  const confirm = useMutation({
    mutationFn: async () => {
      const dataToImport = serialFilter && serialFilter !== "all" ? rows.filter(r => r.serial === serialFilter) : rows;
      
      const unresolved = dataToImport.filter((r) => !resolveMerchant(r.serial));
      if (unresolved.length > 0) {
        throw new Error("Selecione um EC padrão ou vincule os seriais aos terminais.");
      }
      const { data: imp, error: impError } = await supabase
        .from("statements_imports")
        .insert({
          merchant_id: merchantId || null,
          file_name: fileName || "extrato-PrimaHub",
          reference_month: month,
          status: "processing",
        })
        .select("id")
        .single();
      if (impError) throw new Error(impError.message);

      const payload = dataToImport.map((r) => ({
        merchant_id: resolveMerchant(r.serial),
        pos_serial: r.serial,
        modality: r.modality,
        gross_amount: r.amount,
        net_amount: r.netAmount,
        transaction_date: new Date(`${r.date}T12:00:00`).toISOString(),
        installments: r.installments,
        brand: r.brand,
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
    onError: (e: Error) => toast.error(translateError(e.message)),
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
      if (viewingImport?.id) {
        setViewingImport(null);
        setViewingRows([]);
      }
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const baseRows = viewingImport ? viewingRows : rows;
  const displayRows = serialFilter !== "all" ? baseRows.filter(r => r.serial === serialFilter) : baseRows;
  const isViewing = !!viewingImport;
  
  const uniqueSerials = Array.from(new Set(baseRows.map(r => r.serial).filter(Boolean)));

  const totals = MODALITIES.map((m) => ({
    label: m.label,
    total: displayRows.filter((r) => r.modality === m.value).reduce((s, r) => s + r.amount, 0),
  })).filter((t) => t.total > 0);

  const grossTotal = displayRows.reduce((s, r) => s + r.amount, 0);
  const hasNetValues = displayRows.some((r) => r.netAmount !== null);
  const netTotal = displayRows.reduce((s, r) => s + (r.netAmount !== null ? r.netAmount : r.amount), 0);
  const discountedTotal = grossTotal - netTotal;
  const avgDiscountPct = grossTotal > 0 ? (discountedTotal / grossTotal) * 100 : 0;

  return (
    <AppLayout title="Importar Extrato" subtitle="Upload de extratos e conferência do faturamento">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{isViewing ? `Visualizando: ${viewingImport.name}` : "Upload do extrato"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isViewing && (
              <>
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
                    Colunas lidas: serial, modalidade, valor bruto, valor líquido, data
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
              </>
            )}

            {baseRows.length > 0 && (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-lg border">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-xs font-semibold bg-background">
                      Bruto: {BRL(grossTotal)}
                    </Badge>
                    {hasNetValues && (
                      <>
                        <Badge variant="outline" className="text-xs font-semibold text-emerald-600 border-emerald-200 bg-emerald-50/50">
                          Líquido: {BRL(netTotal)}
                        </Badge>
                        <Badge variant="destructive" className="text-xs font-semibold">
                          Descontado: {BRL(discountedTotal)} ({avgDiscountPct.toFixed(2)}%)
                        </Badge>
                      </>
                    )}
                    {totals.map((t) => (
                      <Badge key={t.label} variant="secondary">
                        {t.label}: {BRL(t.total)}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Label className="whitespace-nowrap">Filtrar Equipamento:</Label>
                    <Select value={serialFilter} onValueChange={setSerialFilter}>
                      <SelectTrigger className="w-full sm:w-64 bg-background">
                        <SelectValue placeholder="Todos os equipamentos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os equipamentos</SelectItem>
                        {uniqueSerials.map(serial => (
                          <SelectItem key={serial} value={serial}>
                            {serial}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Serial POS</TableHead>
                        <TableHead>Modalidade</TableHead>
                        <TableHead>Bandeira</TableHead>
                        <TableHead>Parcelas</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right font-semibold">Valor bruto</TableHead>
                        <TableHead className="text-right font-semibold">Valor líquido</TableHead>
                        <TableHead className="text-right font-semibold">Vlr. Descontado</TableHead>
                        <TableHead className="text-right font-semibold">% Descontado</TableHead>
                        {!isViewing && <TableHead />}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRows.map((r, i) => {
                        const isDisc = r.netAmount !== null;
                        const discVal = isDisc ? r.amount - r.netAmount! : 0;
                        const discPct = isDisc && r.amount > 0 ? (discVal / r.amount) * 100 : 0;

                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <Input
                                value={r.serial}
                                disabled={isViewing}
                                placeholder="serial"
                                className="h-8 w-32 font-mono text-xs"
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
                                disabled={isViewing}
                                onValueChange={(v) => {
                                  const next = [...rows];
                                  next[i] = { ...r, modality: v as Modality };
                                  setRows(next);
                                }}
                              >
                                <SelectTrigger className="h-8 w-40">
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
                            <TableCell>
                              <span className="text-sm">{r.brand}</span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm font-medium">{r.installments}x</span>
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">{r.date}</TableCell>
                            <TableCell className="text-right text-sm font-medium whitespace-nowrap">
                              {BRL(r.amount)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {r.netAmount !== null ? BRL(r.netAmount) : "-"}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-destructive whitespace-nowrap">
                              {isDisc ? BRL(discVal) : "-"}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium text-muted-foreground whitespace-nowrap">
                              {isDisc ? `${discPct.toFixed(2)}%` : "-"}
                            </TableCell>
                            {!isViewing && (
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
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                    <TableFooter className="bg-muted/50 font-bold border-t">
                      <TableRow>
                        <TableCell colSpan={5}>Total ({displayRows.length} lançamentos)</TableCell>
                        <TableCell className="text-right font-bold whitespace-nowrap">{BRL(grossTotal)}</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {hasNetValues ? BRL(netTotal) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-destructive whitespace-nowrap">
                          {hasNetValues ? BRL(discountedTotal) : "-"}
                        </TableCell>
                        <TableCell className="text-right font-bold text-muted-foreground whitespace-nowrap">
                          {hasNetValues ? `${avgDiscountPct.toFixed(2)}%` : "-"}
                        </TableCell>
                        {!isViewing && <TableCell />}
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
                {!isViewing ? (
                  <div className="flex items-center gap-3">
                    <Button onClick={() => confirm.mutate()} disabled={confirm.isPending}>
                      <CheckCircle2 className="size-4" /> Confirmar importação
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setRows([]);
                        setFileName("");
                        setSerialFilter("all");
                      }} 
                      disabled={confirm.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => {
                    setViewingImport(null);
                    setViewingRows([]);
                  }}>
                    Voltar para upload
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Histórico de importações</CardTitle>
            <div className="w-[180px]">
              <Select value={historyMonthFilter} onValueChange={setHistoryMonthFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {Array.from(new Set((imports.data ?? []).map(i => i.reference_month)))
                    .sort((a, b) => b.localeCompare(a))
                    .map(m => (
                      <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {(imports.data ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma importação registrada.</p>
            )}
            
            {Object.entries(
              (imports.data ?? [])
              .filter(i => historyMonthFilter === "all" || i.reference_month === historyMonthFilter)
              .reduce((acc, current) => {
                const month = current.reference_month;
                if (!acc[month]) acc[month] = [];
                acc[month].push(current);
                return acc;
              }, {} as Record<string, typeof imports.data>)
            )
            .sort(([monthA], [monthB]) => monthB.localeCompare(monthA))
            .map(([month, items]) => (
              <div key={month} className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground border-b pb-1">
                  {monthLabel(month)}
                </h3>
                {items!.map((i) => (
              <div 
                key={i.id} 
                className={`rounded-lg border p-3 group relative cursor-pointer transition-colors hover:bg-muted/50 ${viewingImport?.id === i.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                onClick={() => {
                  if (viewingImport?.id === i.id) {
                    setViewingImport(null);
                    setViewingRows([]);
                  } else {
                    loadImportView(i);
                  }
                }}
              >
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
                  onClick={(e) => {
                    e.stopPropagation(); // prevent clicking the card
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

