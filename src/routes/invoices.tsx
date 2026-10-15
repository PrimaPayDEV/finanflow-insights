import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Receipt, AlertCircle, MessageCircle, FileText, ExternalLink } from "lucide-react";
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
import { BRL, formatCurrencyInput } from "@/lib/format";

function getStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">Pendente</Badge>;
    case "OVERDUE":
      return <Badge variant="destructive">Vencida</Badge>;
    case "RECEIVED":
    case "CONFIRMED":
    case "RECEIVED_IN_CASH":
      return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white">Recebida</Badge>;
    case "REFUNDED":
      return <Badge variant="secondary">Reembolsada</Badge>;
    case "REFUND_REQUESTED":
      return <Badge variant="secondary">Reembolso Solicitado</Badge>;
    case "AWAITING_RISK_ANALYSIS":
      return <Badge className="bg-blue-500 hover:bg-blue-600 text-white">Em análise</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

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
      const numAmount = Number(amount.replace(/\D/g, "")) / 100;
      if (!amount || numAmount <= 0) throw new Error("Valor inválido");

      const member = members?.find(m => m.id === memberId);
      if (!member) throw new Error("Associado não encontrado");

      const res = await generateInvoice({
        data: {
          companyId,
          memberId,
          amount: numAmount,
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
            <Input type="text" value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
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

function BoletoDetailDialog({
  open,
  onOpenChange,
  invoice,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any | null;
}) {
  if (!invoice) return null;
  const url = invoice.bankSlipUrl || invoice.invoiceUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6 bg-card border-border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
            <Receipt className="size-5 text-primary" />
            Detalhes da Cobrança / Boleto
          </DialogTitle>
          <DialogDescription className="text-xs">
            Consulte as informações e acesse a 2ª via da fatura
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 text-xs">
          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex justify-between items-center">
            <span className="text-muted-foreground font-semibold">Cliente / Associado:</span>
            <span className="font-bold text-foreground">{invoice.customerName || invoice.customer}</span>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex justify-between items-center">
            <span className="text-muted-foreground font-semibold">Descrição:</span>
            <span className="font-medium text-foreground">{invoice.description || "Mensalidade"}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-[10px] text-muted-foreground block">Vencimento</span>
              <span className="font-bold text-foreground">
                {invoice.dueDate ? invoice.dueDate.split("-").reverse().join("/") : "—"}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-[10px] text-muted-foreground block">Valor</span>
              <span className="font-extrabold text-foreground">{BRL(invoice.value)}</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 flex justify-between items-center">
            <span className="text-muted-foreground font-semibold">Status:</span>
            {getStatusBadge(invoice.status)}
          </div>

          {url ? (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <span className="text-[11px] font-semibold text-primary block">Link Seguro da Fatura:</span>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary underline break-all block font-mono hover:text-primary/80"
              >
                {url}
              </a>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs">
              O link direto desta cobrança não foi retornado pelo gateway ou está sendo processado.
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-2 pt-2 border-t border-border/60">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">
            Fechar
          </Button>

          {url && (
            <Button
              size="sm"
              asChild
              className="rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
            >
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Acessar Boleto
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoicesPage() {
  const { companyId } = useAuth();
  const fetchMetrics = useServerFn(getAsaasDashboardMetrics);
  
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [boletoModalOpen, setBoletoModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["billing_metrics", companyId],
    queryFn: () => fetchMetrics({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const handleViewBoleto = (p: any) => {
    const url = p.bankSlipUrl || p.invoiceUrl;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success("Boleto aberto em nova aba!");
    } else {
      setSelectedInvoice(p);
      setBoletoModalOpen(true);
    }
  };

  const handleSendWhatsApp = (p: any) => {
    const url = p.invoiceUrl || p.bankSlipUrl || "";
    const dateFormatted = p.dueDate ? p.dueDate.split('-').reverse().join('/') : "";
    const clientName = p.customerName || p.customer || "Associado";
    const text = encodeURIComponent(
      `Olá ${clientName}! Aqui está sua fatura no valor de ${BRL(p.value)} (Vencimento: ${dateFormatted}).\n\nVocê pode acessar e pagar através do link seguro abaixo:\n${url}\n\nQualquer dúvida, estamos à disposição!`
    );
    const phone = p.customerPhone ? p.customerPhone.replace(/\D/g, "") : "";
    const waUrl = phone ? `https://wa.me/55${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
  };

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
          <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
            <CardHeader className="p-5 pb-4 border-b border-border/60">
              <CardTitle className="text-base font-semibold flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Receipt className="size-4" />
                </div>
                Todas as Cobranças
              </CardTitle>
              <CardDescription>As últimas 100 cobranças geradas na sua conta Asaas</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="h-11 px-4 text-left">Cliente</th>
                      <th className="h-11 px-4 text-left">Descrição</th>
                      <th className="h-11 px-4 text-left">Vencimento</th>
                      <th className="h-11 px-4 text-left">Valor</th>
                      <th className="h-11 px-4 text-left">Status</th>
                      <th className="h-11 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.data.recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-muted-foreground text-sm text-center py-12">
                          Nenhuma fatura encontrada. (Ambiente Atualizado)
                        </td>
                      </tr>
                    ) : (
                      data.data.recentPayments.map((p: any) => (
                        <tr key={p.id} className="transition-colors hover:bg-muted/40">
                          <td className="p-4 align-middle font-medium text-foreground">{p.customerName || p.customer}</td>
                          <td className="p-4 align-middle text-muted-foreground">{p.description || "-"}</td>
                          <td className="p-4 align-middle font-mono text-xs">{p.dueDate ? p.dueDate.split('-').reverse().join('/') : "-"}</td>
                          <td className="p-4 align-middle font-semibold text-foreground">{BRL(p.value)}</td>
                          <td className="p-4 align-middle">
                            {getStatusBadge(p.status)}
                          </td>
                          <td className="p-4 align-middle text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-2">
                              {/* Botão Ver Boleto */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl h-8 px-3 text-xs font-semibold text-primary border-primary/30 hover:bg-primary/10 hover:text-primary gap-1.5 shadow-xs"
                                onClick={() => handleViewBoleto(p)}
                                title="Acessar e visualizar o boleto"
                              >
                                <FileText className="size-3.5" />
                                Ver Boleto
                              </Button>

                              {/* Botão Enviar WhatsApp */}
                              <Button
                                variant="outline"
                                size="sm"
                                className="rounded-xl h-8 px-3 text-xs font-semibold text-emerald-600 border-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-700 hover:border-emerald-400 gap-1.5 shadow-xs"
                                onClick={() => handleSendWhatsApp(p)}
                                title="Enviar cobrança pelo WhatsApp"
                              >
                                <MessageCircle className="size-3.5" />
                                Enviar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Detalhes da Cobrança / Boleto */}
      <BoletoDetailDialog
        open={boletoModalOpen}
        onOpenChange={setBoletoModalOpen}
        invoice={selectedInvoice}
      />
    </AppLayout>
  );
}
