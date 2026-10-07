import { createFileRoute } from '@tanstack/react-router'
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { chargesQuery, contractsQuery } from "@/lib/real-estate";
import { generateRentCharge } from "@/lib/real-estate-finance.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Receipt, Calendar, Plus, Link as LinkIcon, DollarSign, Clock, Download } from "lucide-react";
import { formatCurrency, formatCpfCnpj } from "@/lib/format";
import { useState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/real-estate/charges")({
  component: ChargesPage,
});

function NewChargeDialog() {
  const [open, setOpen] = useState(false);
  const { companyId } = useAuth();
  const qc = useQueryClient();
  const contracts = useQuery(contractsQuery);
  const activeContracts = (contracts.data || []).filter(c => c.status === "ACTIVE");

  const [form, setForm] = useState({
    contractId: "",
    competence: "",
    dueDate: "",
    expensesAmount: "0",
  });

  const generateAction = useMutation({
    mutationFn: async () => {
      const res = await generateRentCharge({
        data: {
          companyId: companyId!,
          contractId: form.contractId,
          competence: form.competence,
          dueDate: form.dueDate,
          expensesAmount: Number(form.expensesAmount) || 0,
        }
      });
      if (!res.ok) throw new Error(res.error);
      return res;
    },
    onSuccess: (data) => {
      toast.success("Cobrança gerada com sucesso!");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["real_estate_charges"] });
      if (data.chargeUrl) {
        window.open(data.chargeUrl, "_blank");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="size-4 mr-1" /> Nova Cobrança
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar Cobrança de Aluguel</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-1.5">
            <Label>Contrato Ativo</Label>
            <Select value={form.contractId} onValueChange={(v) => setForm({ ...form, contractId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o contrato" />
              </SelectTrigger>
              <SelectContent>
                {activeContracts.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.properties?.address}, {c.properties?.number} - {c.tenants?.name}
                  </SelectItem>
                ))}
                {activeContracts.length === 0 && <SelectItem value="none" disabled>Nenhum contrato ativo encontrado</SelectItem>}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label>Competência</Label>
              <Input type="month" value={form.competence} onChange={e => setForm({ ...form, competence: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Despesas Extras (IPTU, Condomínio, etc)</Label>
            <Input type="number" step="0.01" value={form.expensesAmount} onChange={e => setForm({ ...form, expensesAmount: e.target.value })} />
            <span className="text-xs text-muted-foreground">O valor do aluguel será somado automaticamente.</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => generateAction.mutate()} disabled={generateAction.isPending || !form.contractId || !form.competence || !form.dueDate}>
            {generateAction.isPending ? "Gerando no Asaas..." : "Gerar Boleto/Pix"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChargesPage() {
  const charges = useQuery(chargesQuery);
  const list = charges.data || [];

  return (
    <AppLayout
      title="Cobranças"
      subtitle="Gestão financeira dos aluguéis (Motor Asaas)"
      actions={<NewChargeDialog />}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total a Receber (Mês)</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(list.filter(c => c.status === "PENDING").reduce((a, b) => a + Number(b.gross_amount), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inadimplência</CardTitle>
            <Clock className="size-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(list.filter(c => c.status === "OVERDUE").reduce((a, b) => a + Number(b.gross_amount), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita (Taxa Admin)</CardTitle>
            <Receipt className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(list.filter(c => c.status === "RECEIVED").reduce((a, b) => a + Number(b.admin_fee_amount), 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Repasses Pendentes</CardTitle>
            <Calendar className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(list.filter(c => c.status === "RECEIVED" && !c.split_id).reduce((a, b) => a + Number(b.owner_amount), 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Cobranças</CardTitle>
          <CardDescription>Boletos e PIX gerados pelo motor financeiro e status de repasse.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Inquilino</th>
                  <th className="px-4 py-3 font-medium">Imóvel</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Valor Total</th>
                  <th className="px-4 py-3 font-medium">Taxa Admin</th>
                  <th className="px-4 py-3 font-medium">Repasse (Prop.)</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {list.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhuma cobrança registrada.
                    </td>
                  </tr>
                )}
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.tenants?.name}</td>
                    <td className="px-4 py-3">{c.properties?.address}, {c.properties?.number}</td>
                    <td className="px-4 py-3">{new Date(c.due_date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-4 py-3 font-bold">{formatCurrency(c.gross_amount)}</td>
                    <td className="px-4 py-3 text-green-600">{formatCurrency(c.admin_fee_amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(c.owner_amount)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.status === "PENDING" ? "secondary" : c.status === "RECEIVED" ? "default" : "destructive"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.asaas_payment_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={c.asaas_payment_url} target="_blank" rel="noreferrer">
                            <LinkIcon className="size-4 mr-1" /> Fatura
                          </a>
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
