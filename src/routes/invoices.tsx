import { createFileRoute } from '@tanstack/react-router';
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Receipt, AlertCircle, MessageCircle, FileText, ExternalLink, Percent, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
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
  const { companyId, appMode, companyName } = useAuth();
  const isPlanmais = appMode === "billing" || companyName?.toLowerCase().includes("planmais");
  const getDefaultDueDate = () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth();
    // Preferência de vencimento padrão dia 20
    if (now.getDate() > 20) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${year}-${pad(month + 1)}-20`;
  };

  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(getDefaultDueDate());

  const fetchMembers = useServerFn(getMembers);
  const { data: members } = useQuery({
    queryKey: ["members", companyId],
    queryFn: () => fetchMembers({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });

  const selectedMember = members?.find(m => m.id === memberId);
  const partner = Array.isArray(selectedMember?.partners) ? selectedMember.partners[0] : (selectedMember?.partners as any);
  const memberVehicles: any[] = Array.isArray((selectedMember as any)?.vehicles) ? (selectedMember as any).vehicles : [];

  // Ao selecionar o associado, preenche o valor com a soma das mensalidades dos veículos dele
  const handleSelectMember = (id: string) => {
    setMemberId(id);
    const m: any = members?.find(x => x.id === id);
    const vehicles: any[] = Array.isArray(m?.vehicles) ? m.vehicles : [];
    const total = vehicles.reduce((acc, v) => acc + (Number(v.monthly_fee) || 0), 0);
    if (total > 0) {
      setAmount(formatCurrencyInput(String(Math.round(total * 100))));
      if (!description) setDescription("Mensalidade Proteção Veicular");
    }
  };

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
          description: description || "Cobrança de Proteção Veicular",
          dueDate: dueDate || undefined,
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
      setDueDate(getDefaultDueDate());
      qc.invalidateQueries({ queryKey: ["billing_metrics"] });
      qc.invalidateQueries({ queryKey: ["billingReports"] });
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
      <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] sm:max-h-[86vh] flex flex-col p-0 gap-0 rounded-2xl bg-card border-border shadow-2xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-5 pb-2.5 border-b border-border/60 shrink-0">
          <DialogTitle>Nova Fatura / Boleto</DialogTitle>
          <DialogDescription>Gere uma nova cobrança híbrida (Pix/Boleto) para um associado.</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-5 space-y-3.5">
          <div className="space-y-2">
            <Label>Associado</Label>
            <Select value={memberId} onValueChange={handleSelectMember}>
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

          {selectedMember && (
            <div className={`p-3 rounded-xl border text-xs ${
              partner?.split_percent && Number(partner.split_percent) > 0
                ? "bg-primary/10 border-primary/25 text-foreground"
                : "bg-muted/40 border-border/60 text-muted-foreground"
            }`}>
              {partner?.split_percent && Number(partner.split_percent) > 0 ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-primary">
                      <Percent className="size-3.5" /> Split de Parceiro Configurado
                    </span>
                    <Badge className="bg-primary text-primary-foreground font-black text-[10px]">
                      {partner.split_percent}%
                    </Badge>
                  </div>
                  <p className="text-[11px] text-foreground">
                    Consultor/Parceiro: <strong>{partner.name}</strong>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {partner.asaas_wallet_id ? `Wallet Asaas: ${partner.asaas_wallet_id}` : "Aviso: Parceiro sem Wallet ID"}
                  </p>
                </div>
              ) : (
                <span className="text-muted-foreground text-[11px]">
                  Associado direto da associação (sem repasse para parceiro).
                </span>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="text" value={amount} onChange={e => setAmount(formatCurrencyInput(e.target.value))} placeholder="R$ 0,00" />
              {selectedMember && memberVehicles.length > 0 && (
                <p className="text-[10px] text-muted-foreground">
                  Mensalidade de {memberVehicles.length} veículo{memberVehicles.length > 1 ? "s" : ""} do associado
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Data de Vencimento</Label>
                <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">Dia 20 Padrão</Badge>
              </div>
              <Input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="font-medium text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição / Referência</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Mensalidade Proteção Veicular" />
          </div>

          {isPlanmais && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <ShieldAlert className="size-4 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">Regra Planmais: Não receber após o vencimento</p>
                <p className="text-[11px] opacity-90 leading-relaxed">
                  Para manter a cobertura ativa e o socorro do veículo do associado, este boleto será registrado no Asaas com bloqueio bancário para não aceitar pagamentos após o vencimento.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="p-3.5 sm:p-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3">
          <AsaasFormSeal />
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              {generate.isPending ? "Gerando..." : "Gerar"}
            </Button>
          </div>
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
  const { appMode, companyName } = useAuth();
  const isPlanmais = appMode === "billing" || companyName?.toLowerCase().includes("planmais");
  if (!invoice) return null;
  const url = invoice.bankSlipUrl || invoice.invoiceUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] sm:max-h-[86vh] flex flex-col p-4 sm:p-5 rounded-2xl bg-card border-border shadow-2xl overflow-y-auto">
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
              {isPlanmais && (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold block mt-0.5">
                  Não aceita após vencimento
                </span>
              )}
            </div>
            <div className="p-3 rounded-xl bg-muted/40 border border-border/50">
              <span className="text-[10px] text-muted-foreground block">Valor</span>
              <span className="font-extrabold text-foreground">{BRL(invoice.value)}</span>
            </div>
          </div>

          {/* Seção de Split de Parceiro */}
          {invoice.hasSplit && (
            <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/25 space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-primary font-bold flex items-center gap-1.5">
                  <Percent className="size-3.5" /> Split de Parceiro Configurado:
                </span>
                <Badge className="bg-primary text-primary-foreground font-black text-[11px]">
                  {invoice.splitPercent}%
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-primary/20">
                <span className="text-muted-foreground">Beneficiário:</span>
                <span className="font-bold text-foreground">{invoice.partnerName || "Consultor"}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Valor Previsto do Repasse:</span>
                <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  {BRL(invoice.splitAmount || 0)}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground pt-0.5">
                O repasse será creditado automaticamente na conta Asaas do parceiro no momento da liquidação da fatura.
              </p>
            </div>
          )}

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

        <div className="flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-3 pt-3 border-t border-border/60">
          <AsaasFormSeal />
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InvoicesPage() {
  const { companyId, appMode, companyName } = useAuth();
  const isPlanmais = appMode === "billing" || companyName?.toLowerCase().includes("planmais");
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
    const planmaisNotice = isPlanmais
      ? `\n\nImportante: Para garantir que seu veículo continue com cobertura ativa para assistência e socorro, o pagamento deve ser realizado impreterivelmente até a data de vencimento. Boletos vencidos não são aceitos pelo banco.`
      : "";
    const text = encodeURIComponent(
      `Olá ${clientName}! Aqui está sua fatura no valor de ${BRL(p.value)} (Vencimento: ${dateFormatted}).\n\nVocê pode acessar e pagar através do link seguro abaixo:\n${url}${planmaisNotice}\n\nQualquer dúvida, estamos à disposição!`
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
                      <th className="h-11 px-4 text-left">Split / Parceiro</th>
                      <th className="h-11 px-4 text-left">Status</th>
                      <th className="h-11 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {data.data.recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-muted-foreground text-sm text-center py-12">
                          Nenhuma fatura encontrada. (Ambiente Atualizado)
                        </td>
                      </tr>
                    ) : (
                      data.data.recentPayments.map((p: any) => (
                        <tr key={p.id} className="transition-colors hover:bg-muted/40">
                          <td className="p-4 align-middle font-medium text-foreground">{p.customerName || p.customer}</td>
                          <td className="p-4 align-middle text-muted-foreground">{p.description || "-"}</td>
                          <td className="p-4 align-middle text-xs">
                            <span className="font-mono font-semibold text-foreground block">
                              {p.dueDate ? p.dueDate.split('-').reverse().join('/') : "-"}
                            </span>
                            {isPlanmais && (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium block">
                                Não aceita pós-venc.
                              </span>
                            )}
                          </td>
                          <td className="p-4 align-middle font-semibold text-foreground">{BRL(p.value)}</td>
                          <td className="p-4 align-middle whitespace-nowrap">
                            {p.hasSplit ? (
                              <div className="space-y-0.5">
                                <Badge className="bg-primary/10 text-primary border border-primary/25 hover:bg-primary/20 text-xs font-semibold gap-1">
                                  <Percent className="size-3" />
                                  {p.partnerName || "Parceiro"}: {p.splitPercent}%
                                </Badge>
                                <span className="text-[11px] text-muted-foreground block font-mono">
                                  Repasse: {BRL(p.splitAmount || 0)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Direto (sem split)</span>
                            )}
                          </td>
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
