import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { read, utils } from "xlsx";
import { useState } from "react";
import { FileUp, CheckCircle2, AlertTriangle, AlertCircle, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { merchantsQuery, terminalsQuery, feePlansQuery } from "@/lib/db";
import { BRL } from "@/lib/format";
import { translateError } from "@/lib/translateError";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/admin/recebiveis/import")({
  head: () => ({
    meta: [{ title: "Importar Recebíveis | Admin" }],
  }),
  component: AdminRecebiveisImportPage,
});

type RawRow = {
  externalId: string;
  acquirer: string;
  nsu: string;
  status: string;
  captureDate: string;
  grossValue: number;
  netValue: number;
  document: string;
  merchantName: string;
  serialNumber: string;
  payerName: string;
  paymentType: string;
  installments: string;
  brand: string;
  plan: string;
  simCard: string;
};

type ProcessedRow = RawRow & {
  merchantId: string | null;
  merchantNameDb: string | null;
  posId: string | null;
  feePercent: number;
  creditedValue: number;
  error?: string;
  isValid: boolean;
};

function parseValue(val: any): number {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const str = String(val).replace(/[^0-9,-]/g, "").replace(",", ".");
  return Number(str) || 0;
}

function AdminRecebiveisImportPage() {
  const qc = useQueryClient();
  const { companyId, user } = useAuth();
  const merchants = useQuery(merchantsQuery);
  const terminals = useQuery(terminalsQuery);
  const feePlans = useQuery(feePlansQuery);

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ProcessedRow[]>([]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setLoading(true);

    try {
      const buffer = await f.arrayBuffer();
      const wb = read(buffer, { type: "array", cellDates: true });
      if (!wb.SheetNames.length) throw new Error("Planilha vazia");
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData: any[][] = utils.sheet_to_json(ws, { header: 1, defval: "" });

      if (rawData.length < 2) throw new Error("A planilha não contém dados");

      const header = rawData[0].map((h) => String(h).toLowerCase().trim());
      const idx = (names: string[]) => {
        for (const name of names) {
          const i = header.findIndex((h) => h === name || h.includes(name));
          if (i !== -1) return i;
        }
        return -1;
      };

      const iId = idx(["id"]);
      const iAcquirer = idx(["adquirente"]);
      const iNsu = idx(["nsu"]);
      const iStatus = idx(["status"]);
      const iDate = idx(["data de captura"]);
      const iGross = idx(["valor"]);
      const iNet = idx(["valor líquido", "valor liquido"]);
      const iDoc = idx(["documento"]);
      const iName = idx(["nome comercial"]);
      const iSn = idx(["sn equipamento", "sn", "serial"]);
      const iType = idx(["tipo de pagamento"]);
      const iBrand = idx(["bandeira"]);
      const iInstallments = idx(["parcelamento"]);

      if (iId === -1 || iSn === -1 || iNet === -1) {
        throw new Error("Colunas obrigatórias não encontradas (ID, SN Equipamento, Valor líquido)");
      }

      const parsed: ProcessedRow[] = [];
      const mList = merchants.data ?? [];
      const tList = terminals.data ?? [];
      const fList = feePlans.data ?? [];

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0 || !row[iId]) continue;

        const status = String(row[iStatus] || "");
        const externalId = String(row[iId]);
        const serialNumber = String(row[iSn]);
        const netValue = parseValue(row[iNet]);
        
        let merchantId: string | null = null;
        let posId = null;
        let merchantNameDb = null;
        let feePercent = 0;
        let creditedValue = 0;
        let error = undefined;
        let isValid = false;

        // Validar Status
        if (status.toLowerCase() !== "sucesso") {
          error = "Status não é sucesso";
        } else {
          // Achar POS
          const term = tList.find((t) => t.serial_number === serialNumber);
          if (!term) {
            error = "POS não vinculada";
          } else {
            posId = term.id;
            merchantId = term.merchant_id;
            const merch = mList.find((m) => m.id === merchantId);
            if (merch) {
              merchantNameDb = merch.name;
              // Achar Taxa Operacional
              const plan = fList.find((p) => p.merchant_id === merchantId);
              if (plan && plan.fixed_rate_percent !== null) {
                feePercent = Number(plan.fixed_rate_percent);
              }
              
              // Calcular
              const feeAmount = (netValue * feePercent) / 100;
              creditedValue = netValue - feeAmount;
              isValid = true;
            } else {
              error = "Estabelecimento não encontrado no DB";
            }
          }
        }

        parsed.push({
          externalId,
          acquirer: String(row[iAcquirer] || ""),
          nsu: String(row[iNsu] || ""),
          status,
          captureDate: String(row[iDate] || ""),
          grossValue: parseValue(row[iGross]),
          netValue,
          document: String(row[iDoc] || ""),
          merchantName: String(row[iName] || ""),
          serialNumber,
          payerName: "",
          paymentType: String(row[iType] || ""),
          installments: String(row[iInstallments] || ""),
          brand: String(row[iBrand] || ""),
          plan: "",
          simCard: "",
          merchantId,
          merchantNameDb,
          posId,
          feePercent,
          creditedValue,
          error,
          isValid
        });
      }

      setRows(parsed);
    } catch (e: any) {
      toast.error("Erro ao ler arquivo: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const doImport = useMutation({
    mutationFn: async () => {
      if (!companyId || !user) throw new Error("Sessão inválida");
      
      const validRows = rows.filter(r => r.isValid);
      if (validRows.length === 0) throw new Error("Nenhuma linha válida para importar");

      // 1. Criar registro de importação
      const importRecord = {
        company_id: companyId,
        filename: file?.name || "import",
        processed_rows: rows.length,
        imported_rows: 0,
        duplicated_rows: 0,
        rejected_rows: rows.length - validRows.length,
        created_by: user.id
      };

      const { data: imp, error: errImp } = await supabase
        .from("receivables_imports")
        .insert(importRecord)
        .select("id")
        .single();
        
      if (errImp || !imp) throw new Error("Erro ao criar registro de import: " + errImp?.message);

      let imported = 0;
      let duplicated = 0;

      // 2. Inserir transações uma a uma e ledger
      for (const row of validRows) {
        // Verificar duplicidade antes de inserir
        const { data: existing } = await supabase
          .from("receivables_transactions")
          .select("id")
          .eq("company_id", companyId)
          .eq("external_id", row.externalId)
          .single();

        if (existing) {
          duplicated++;
          continue;
        }

        const { data: tx, error: errTx } = await supabase
          .from("receivables_transactions")
          .insert({
            company_id: companyId,
            merchant_id: row.merchantId,
            pos_id: row.posId,
            import_id: imp.id,
            external_id: row.externalId,
            acquirer: row.acquirer,
            nsu: row.nsu,
            status: row.status,
            gross_value: row.grossValue,
            net_value: row.netValue,
            applied_fee_percent: row.feePercent,
            credited_value: row.creditedValue,
          })
          .select("id")
          .single();

        if (errTx || !tx) {
          console.error("Erro tx", errTx);
          continue;
        }

        // Criar ledger (CREDIT) - entrada de saldo
        const { error: errLg } = await supabase
          .from("receivables_ledgers")
          .insert({
            company_id: companyId,
            merchant_id: row.merchantId!,
            type: "CREDIT",
            amount: row.creditedValue,
            status: "LIQUIDATED",
            description: "Recebível de Venda",
            transaction_id: tx.id
          });

        if (!errLg) {
          imported++;
        }
      }

      // Atualizar contadores
      await supabase
        .from("receivables_imports")
        .update({ imported_rows: imported, duplicated_rows: duplicated })
        .eq("id", imp.id);

      return { imported, duplicated, rejected: importRecord.rejected_rows };
    },
    onSuccess: (res) => {
      toast.success(`Importação concluída! Sucesso: ${res.imported} | Duplicadas: ${res.duplicated} | Rejeitadas: ${res.rejected}`);
      setRows([]);
      setFile(null);
      // resetar input file
      const input = document.getElementById("file-upload") as HTMLInputElement;
      if (input) input.value = "";
    },
    onError: (e: Error) => toast.error(translateError(e.message))
  });

  return (
    <AppLayout
      title="Importar Recebíveis"
      subtitle="Importe relatórios de vendas para creditar os estabelecimentos"
    >
      <div className="grid gap-4">
        <Card className="border-none shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Upload de Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div 
              className="relative group cursor-pointer" 
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-primary/20 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all duration-200">
                <div className="p-4 bg-background border shadow-sm text-primary rounded-full mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-all">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold mb-1 text-foreground">Clique para fazer upload</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Arraste e solte sua planilha aqui, ou clique para procurar.<br/>
                  <span className="text-xs opacity-75">Suporta .xlsx, .xls, .csv</span>
                </p>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                disabled={loading || doImport.isPending}
                className="hidden"
              />
            </div>

            {file && (
              <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 text-primary rounded-lg">
                    <FileUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium line-clamp-1">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => { 
                    setFile(null); 
                    setRows([]); 
                    const input = document.getElementById("file-upload") as HTMLInputElement;
                    if (input) input.value = "";
                  }} 
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {rows.length > 0 && (
          <Card className="border-none shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Prévia da Importação</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Verifique os dados calculados antes de confirmar.
                </p>
              </div>
              <Button onClick={() => doImport.mutate()} disabled={doImport.isPending}>
                <CheckCircle2 className="size-4 mr-2" />
                Confirmar Importação
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-4">
                <Badge variant="outline" className="bg-muted">Total: {rows.length}</Badge>
                <Badge variant="default" className="bg-emerald-500">
                  Válidas: {rows.filter(r => r.isValid).length}
                </Badge>
                <Badge variant="destructive">
                  Com erro: {rows.filter(r => !r.isValid).length}
                </Badge>
              </div>

              <div className="rounded-md border max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-muted z-10">
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Estabelecimento</TableHead>
                      <TableHead>S/N</TableHead>
                      <TableHead className="text-right">Líquido Origem</TableHead>
                      <TableHead className="text-right">Taxa Op.</TableHead>
                      <TableHead className="text-right">Creditado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {r.isValid ? (
                            <Badge variant="default" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-none">Pronto</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-none" title={r.error}>
                              <AlertTriangle className="size-3 mr-1" /> Erro
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.externalId}</TableCell>
                        <TableCell>
                          {r.merchantNameDb ? (
                            <span className="font-medium">{r.merchantNameDb}</span>
                          ) : (
                            <span className="text-muted-foreground italic text-xs">{r.merchantName} (Não no DB)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{r.serialNumber}</TableCell>
                        <TableCell className="text-right">{BRL(r.netValue)}</TableCell>
                        <TableCell className="text-right">{r.feePercent}%</TableCell>
                        <TableCell className="text-right font-bold text-emerald-600">{BRL(r.creditedValue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
