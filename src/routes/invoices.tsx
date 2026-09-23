import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Receipt, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getMembers, generateInvoice } from "@/lib/members.functions";
import { getAsaasDashboardMetrics } from "@/lib/asaas.functions";
import { translateError } from "@/lib/translateError";
import { BRL } from "@/lib/format";

export const Route = createFileRoute("/invoices")({
  head: () => ({
    meta: [{ title: "Faturas | Gestão de Cobranças" }],
  }),
  component: InvoicesPage,
});

function NewInvoiceDialog() {
  const qc = useQueryClient();
  const { companyId } = useAuth();
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const fetchMembers = useServerFn(getMembers);
  const { data: members } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error("Empresa não identificada");
      if (!memberId) throw new Error("Selecione o associado");
      if (!amount || Number(amount) <= 0) throw new Error("Valor inválido");

      const member = members?.find(m => m.id === memberId);
      if (!member) throw new Error("Associado não encontrado");

      const res = await generateInvoice({
        data: {
          companyId,
          memberId,
          amount: Number(amount),
          description: description || "Cobrança de Proteção Veicular"
        }
      });
      
      if (!res.ok) throw new Error("Falha ao gerar cobrança");
    },
    onSuccess: () => {
      toast.success("Fatura gerada com sucesso!");
      setOpen(false);
      setMemberId("");
      setAmount("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["billing_metrics"] });
    },
    onError: (e) => toast.error(translateError(e.message)),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="size-4" /> Gerar Fatura
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Fatura / Boleto</DialogTitle>
          <DialogDescription>Gere uma nova cobrança híbrida (Pix/Boleto) para um associado.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label>Associado</Label>
            <Select value={memberId} onValueChange={setMemberId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                {members?.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Descrição / Referência</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Mensalidade Proteção Veicular" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
            {generate.isPending ? "Gerando..." : "Gerar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoicesPage() {
  const { companyId } = useAuth();
  const fetchMetrics = useServerFn(getAsaasDashboardMetrics);
  
  const { data, isLoading } = useQuery({
    queryKey: ["billing_metrics", companyId],
    queryFn: () => fetchMetrics({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  return (
    <AppLayout 
      title="Faturas & Cobranças" 
      subtitle="Gerencie os recebimentos dos seus associados via Asaas"
      actions={<NewInvoiceDialog />}
    >
      {isLoading ? (
        <div className="flex justify-center p-8">Sincronizando com Asaas...</div>
      ) : !data?.ok ? (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
          <AlertCircle className="size-12 text-destructive" />
          <p className="text-lg font-medium text-destructive">Erro de Integração</p>
          <p className="text-muted-foreground max-w-sm">
            {data?.error}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="size-5" /> Todas as Cobranças
              </CardTitle>
              <CardDescription>As últimas 100 cobranças geradas na sua conta Asaas</CardDescription>
            </CardHeader>
            <CardContent>
              {data.data.recentPayments.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">Nenhuma fatura encontrada.</p>
              ) : (
                <div className="relative w-full overflow-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b">
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Cliente</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Descrição</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Vencimento</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Valor</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {data.data.recentPayments.map((p: any) => (
                        <tr key={p.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4 align-middle font-medium">{p.customer}</td>
                          <td className="p-4 align-middle">{p.description || "-"}</td>
                          <td className="p-4 align-middle">{p.dueDate}</td>
                          <td className="p-4 align-middle">{BRL(p.value)}</td>
                          <td className="p-4 align-middle">
                            <Badge variant={p.status === "RECEIVED" || p.status === "CONFIRMED" ? "default" : p.status === "OVERDUE" ? "destructive" : "secondary"}>
                              {p.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
