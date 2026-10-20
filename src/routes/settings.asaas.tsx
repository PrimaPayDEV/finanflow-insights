import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  KeyRound,
  ShieldCheck,
  TriangleAlert,
  Split,
  QrCode,
  Save,
  Webhook,
  Copy,
  ShieldAlert,
  Activity,
  CheckCircle2,
  Clock,
  Eye,
  Phone,
  Mail,
  ExternalLink,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { AsaasFormSeal } from "@/components/AsaasBaasSeal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { checkAsaasConfigured } from "@/lib/asaas.functions";
import { asaasSettingsQuery, asaasEventsQuery, type AsaasSettings } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { translateError } from "@/lib/translateError";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/settings/asaas")({
  head: () => ({
    meta: [
      { title: "Configuração Asaas | PrimaHub" },
      {
        name: "description",
        content:
          "Preferências de cobrança PrimaHub no Asaas: vencimento, multa, juros, desconto, ambiente e sincronização de status por webhook.",
      },
      { property: "og:title", content: "Configuração Asaas | PrimaHub" },
      {
        property: "og:description",
        content: "Preferências de cobrança, split e sincronização automática de pagamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AsaasSettingsPage,
});

const defaults = {
  due_day: 10,
  fine_percent: 2,
  interest_percent: 1,
  discount_percent: 0,
  discount_deadline_days: 0,
  default_description: "Fatura PrimaHub",
  sandbox: false,
};

function AsaasSettingsPage() {
  const { companyId, appMode, companyName } = useAuth();
  const isPlanmais = appMode === "billing" || companyName?.toLowerCase().includes("planmais");
  const qc = useQueryClient();
  const check = useServerFn(checkAsaasConfigured);
  const status = useQuery({
    queryKey: ["asaas-status", companyId],
    queryFn: () => check({ data: { companyId: companyId! } }),
    enabled: !!companyId,
  });
  const settings = useQuery(asaasSettingsQuery);
  const events = useQuery(asaasEventsQuery);
  const configured = status.data?.configured;

  const [form, setForm] = useState(defaults);
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [webhookToken, setWebhookToken] = useState("");
  const [savingWebhookToken, setSavingWebhookToken] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  useEffect(() => {
    if (settings.data) {
      setForm({
        due_day: settings.data.due_day,
        fine_percent: Number(settings.data.fine_percent),
        interest_percent: Number(settings.data.interest_percent),
        discount_percent: Number(settings.data.discount_percent),
        discount_deadline_days: settings.data.discount_deadline_days,
        default_description: settings.data.default_description,
        sandbox: settings.data.sandbox,
      });
    }
  }, [settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload: Partial<AsaasSettings> = { ...form };
      const existing = settings.data?.id;
      const { error } = existing
        ? await supabase.from("asaas_settings").update(payload).eq("id", existing)
        : await supabase.from("asaas_settings").insert(payload as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Preferências de cobrança salvas com sucesso!");
      qc.invalidateQueries({ queryKey: ["asaas_settings"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const saveApiKey = async () => {
    if (!companyId) return;
    if (!apiKey.trim()) return toast.error("Insira uma chave válida");

    setSavingKey(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ asaas_api_key: apiKey.trim() })
        .eq("id", companyId);
      if (error) throw error;
      toast.success("Chave de API salva com sucesso!");
      setApiKey("");
      qc.invalidateQueries({ queryKey: ["asaas-status", companyId] });
    } catch (e: any) {
      toast.error(translateError(e.message));
    } finally {
      setSavingKey(false);
    }
  };

  const saveWebhookToken = async () => {
    if (!companyId) return;
    if (!webhookToken.trim()) return toast.error("Insira um token válido");

    setSavingWebhookToken(true);
    try {
      const { error } = await supabase
        .from("companies")
        .update({ asaas_webhook_token: webhookToken.trim() })
        .eq("id", companyId);
      if (error) throw error;
      toast.success("Token do Webhook salvo com sucesso!");
      setWebhookToken("");
      qc.invalidateQueries({ queryKey: ["asaas-status", companyId] });
    } catch (e: any) {
      toast.error(translateError(e.message));
    } finally {
      setSavingWebhookToken(false);
    }
  };

  const webhookUrl = companyId
    ? `https://primahubec.lovable.app/api/public/asaas-webhook?company_id=${companyId}`
    : "";

  return (
    <AppLayout
      title="Configuração Asaas"
      subtitle={
        isPlanmais
          ? "Parâmetros de cobrança, proteção veicular e sincronização via Asaas"
          : "Preferências de cobrança, split e sincronização"
      }
    >
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid gap-6 lg:grid-cols-12 items-stretch">
          {/* ========================================================= */}
          {/* COLUNA ESQUERDA: Autenticação, Chave API e Webhooks        */}
          {/* ========================================================= */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Card 1: Chave de API Asaas */}
            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
              <CardHeader className="p-6 pb-4 border-b border-border/60 flex flex-row items-center justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                    <KeyRound className="size-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Chave de API Asaas
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Integração direta com o gateway
                    </CardDescription>
                  </div>
                </div>

                {status.isLoading ? (
                  <Badge variant="secondary" className="font-mono text-[11px] px-2.5 py-0.5">
                    verificando…
                  </Badge>
                ) : configured ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-semibold gap-1.5 px-2.5 py-0.5">
                    <ShieldCheck className="size-3.5" /> Conectado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs font-semibold gap-1.5 px-2.5 py-0.5">
                    <TriangleAlert className="size-3.5" /> Não configurada
                  </Badge>
                )}
              </CardHeader>

              <CardContent className="p-6 space-y-4 text-sm">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Insira a chave de API gerada no painel do Asaas (Menu <strong>Configurações da Conta → Integrações</strong>).
                  Certifique-se de utilizar a chave correspondente ao ambiente ativo.
                </p>

                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                  <Input
                    type="password"
                    placeholder="Ex: $aact_..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="font-mono text-xs bg-background rounded-xl h-10 border-border/80 focus-visible:ring-primary/20"
                  />
                  <Button
                    onClick={saveApiKey}
                    disabled={savingKey || !apiKey.trim()}
                    className="h-10 px-4 rounded-xl font-semibold shadow-xs shrink-0 gap-1.5"
                  >
                    <Save className="size-3.5" />
                    <span>Salvar Chave</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Sincronização Webhook & Eventos */}
            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden flex-1 flex flex-col justify-between">
              <CardHeader className="p-6 pb-4 border-b border-border/60 flex flex-row items-center justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                    <Webhook className="size-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Sincronização de Status
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Atualizações automáticas via Webhook
                    </CardDescription>
                  </div>
                </div>

                <Badge
                  variant={status.data?.webhookTokenConfigured ? "outline" : "secondary"}
                  className="text-[11px] px-2.5 py-0.5"
                >
                  {status.data?.webhookTokenConfigured ? "Token ativo" : "Sem token"}
                </Badge>
              </CardHeader>

              <CardContent className="p-6 space-y-5 text-sm flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground/80">
                      URL de Destino do Webhook
                    </Label>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Cadastre esta URL no Asaas em <strong>Integrações → Webhooks de Cobranças</strong> para
                      atualizar pagamentos, baixas e cancelamentos automaticamente.
                    </p>
                    <div className="flex gap-2 items-center">
                      <Input
                        readOnly
                        value={webhookUrl}
                        className="font-mono text-xs bg-muted/30 rounded-xl h-10 border-border/60 selection:bg-primary/20"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-10 rounded-xl shrink-0 hover:bg-muted"
                        title="Copiar URL"
                        onClick={() => {
                          if (!webhookUrl) return;
                          navigator.clipboard.writeText(webhookUrl);
                          toast.success("URL copiada para a área de transferência!");
                        }}
                      >
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground/80">
                        Token de Autenticação do Webhook
                      </Label>
                      <span className="text-[10px] text-muted-foreground">Opcional e Recomendado</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                      <Input
                        type="password"
                        placeholder="Token configurado na fila do Webhook"
                        value={webhookToken}
                        onChange={(e) => setWebhookToken(e.target.value)}
                        className="font-mono text-xs bg-background rounded-xl h-10 border-border/80 focus-visible:ring-primary/20"
                      />
                      <Button
                        onClick={saveWebhookToken}
                        disabled={savingWebhookToken || !webhookToken.trim()}
                        className="h-10 px-4 rounded-xl font-semibold shadow-xs shrink-0"
                      >
                        Salvar Token
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Activity className="size-3.5 text-primary" />
                      Últimos Eventos Recebidos
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {events.data?.length ? `${events.data.length} eventos` : "0 eventos"}
                    </span>
                  </div>

                  {events.data?.length ? (
                    <div className="rounded-xl border border-border/60 bg-muted/20 divide-y divide-border/40 overflow-hidden min-h-[140px] max-h-56 overflow-y-auto">
                      {events.data.slice(0, 8).map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setSelectedEvent(e)}
                          className="w-full text-left p-2.5 px-3 hover:bg-muted/40 transition-colors flex items-center justify-between gap-2 group"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Clock className="size-3 text-muted-foreground shrink-0" />
                            <span className="text-[11px] font-semibold text-foreground font-mono shrink-0">
                              {new Date(e.created_at).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              })}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate font-mono">
                              {e.event}
                            </span>
                          </div>
                          <Eye className="size-3.5 text-muted-foreground/60 group-hover:text-primary shrink-0 transition-colors" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-dashed border-border/70 text-center">
                      <p className="text-xs text-muted-foreground">
                        Nenhum evento do webhook recebido recentemente.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ========================================================= */}
          {/* COLUNA DIREITA: Preferências de Cobrança                  */}
          {/* ========================================================= */}
          <div className="lg:col-span-7 flex flex-col">
            {/* Card 3: Preferências de Cobrança */}
            <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden flex-1 flex flex-col justify-between">
              <CardHeader className="p-6 pb-4 border-b border-border/60 flex flex-row items-center justify-between gap-3 space-y-0">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                    <Save className="size-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">
                      Preferências de Cobrança
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Prazos, taxas de juros, multas e regras de vencimento
                    </CardDescription>
                  </div>
                </div>

                <Badge variant="outline" className="text-[11px] font-mono px-2.5 py-0.5">
                  Dia {form.due_day}
                </Badge>
              </CardHeader>

              <CardContent className="p-6 space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  {/* Banner especial para o ambiente Planmais */}
                  {isPlanmais && (
                    <div className="p-4.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5 shadow-2xs">
                      <ShieldAlert className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-xs text-amber-900 dark:text-amber-300">
                            Regra de Proteção Veicular (Planmais)
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-semibold"
                          >
                            Bloqueio Pós-Vencimento Ativo
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          No ramo de proteção veicular, os associados precisam estar com a mensalidade rigorosamente
                          em dia para manter o veículo socorrido e com assistência ativa. Por esse motivo, os boletos
                          emitidos são registrados no Asaas com <strong>cancelamento imediato do registro bancário após a data de vencimento</strong> (não recebimento após o vencimento).
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4.5 sm:grid-cols-2">
                    <Field
                      label="Dia de vencimento padrão"
                      value={form.due_day}
                      onChange={(v) => setForm({ ...form, due_day: Number(v) })}
                      type="number"
                      hint="Fins de semana e feriados nacionais/bancários prorrogam automaticamente para o próximo dia útil."
                    />

                    <Field
                      label="Multa após vencimento (%)"
                      value={form.fine_percent}
                      onChange={(v) => setForm({ ...form, fine_percent: Number(v) })}
                      type="number"
                      hint={
                        isPlanmais
                          ? "Inativo para Planmais: boletos são cancelados no vencimento e não aceitam pagamento com multa."
                          : "Percentual cobrado em caso de atraso."
                      }
                    />

                    <Field
                      label="Juros ao mês (%)"
                      value={form.interest_percent}
                      onChange={(v) => setForm({ ...form, interest_percent: Number(v) })}
                      type="number"
                      hint={
                        isPlanmais
                          ? "Inativo para Planmais: pagamentos após o vencimento não são aceitos."
                          : "Juros de mora proporcionais aos dias de atraso."
                      }
                    />

                    <Field
                      label="Desconto de pontualidade (%)"
                      value={form.discount_percent}
                      onChange={(v) => setForm({ ...form, discount_percent: Number(v) })}
                      type="number"
                      hint="Desconto para pagamento antecipado (opcional)."
                    />

                    <Field
                      label="Antecedência do desconto (dias)"
                      value={form.discount_deadline_days}
                      onChange={(v) => setForm({ ...form, discount_deadline_days: Number(v) })}
                      type="number"
                      hint="Quantidade de dias antes do vencimento para ter direito ao desconto."
                    />

                    <Field
                      label="Descrição padrão na fatura"
                      value={form.default_description}
                      onChange={(v) => setForm({ ...form, default_description: v })}
                      hint="Texto exibido no boleto e na fatura digital do cliente."
                    />
                  </div>

                  <Separator />

                  {/* Alternador de Ambiente Sandbox */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-muted/20 border border-border/60">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-foreground">Ambiente Sandbox (Modo de Testes)</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Ativado: cobranças simuladas sem cobrança real. Desativado: ambiente de produção oficial.
                      </p>
                    </div>
                    <Switch
                      checked={form.sandbox}
                      onCheckedChange={(v) => setForm({ ...form, sandbox: v })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/40">
                  <AsaasFormSeal />
                  <Button
                    onClick={() => save.mutate()}
                    disabled={save.isPending}
                    className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold shadow-xs gap-2"
                  >
                    <Save className="size-4" />
                    <span>{save.isPending ? "Salvando alterações..." : "Salvar Preferências"}</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SEÇÃO 2: Como a Cobrança Funciona (Full Width 3 Colunas)  */}
        {/* ========================================================= */}
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Como a Cobrança Funciona
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mt-0.5">
                Regras de emissão, split automatizado e liquidação integrada via Asaas
              </CardDescription>
            </div>
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary font-medium flex items-center gap-2 self-start sm:self-auto">
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-[10px] px-1.5 py-0 font-semibold">
                Ambiente
              </Badge>
              <span className="font-semibold">
                {form.sandbox ? "Sandbox (Testes)" : "Produção"}
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Feature
                icon={QrCode}
                title="Boleto com Pix Híbrido"
                text="Cada cobrança gerada contém tanto a linha digitável do boleto bancário tradicional quanto o QR Code Pix dinâmico no mesmo documento para pagamento instantâneo."
              />

              <Feature
                icon={Split}
                title="Split Automático para Parceiros"
                text="As comissões cadastradas para consultores e parceiros são transferidas automaticamente pelo Asaas na liquidação da fatura para suas respectivas Wallets."
              />

              <Feature
                icon={ShieldCheck}
                title="Sincronização e Cadastro Automático"
                text="O cliente ou associado é localizado pelo CPF/CNPJ no Asaas e cadastrado automaticamente sem duplicidades na emissão da fatura."
              />
            </div>
          </CardContent>
        </Card>

        {/* ========================================================= */}
        {/* SEÇÃO REGULATÓRIA: Conformidade BaaS e BACEN               */}
        {/* ========================================================= */}
        <Card className="rounded-2xl border-2 border-primary/20 bg-card shadow-card overflow-hidden">
          <CardHeader className="p-6 pb-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
                <ShieldCheck className="size-4.5" />
              </div>
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Conformidade Regulatória BaaS Asaas (Resolução Conjunta nº 16/2025 BACEN)
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Instituição financeira de pagamento, identificação de marca e canais de suporte ao cliente
                </CardDescription>
              </div>
            </div>

            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-xs font-semibold gap-1.5 py-1 px-3 shrink-0">
              <ShieldCheck className="size-3.5" />
              Homologado BACEN
            </Badge>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-primary" />
                  Instituição Regulada (BaaS)
                </span>
                <p className="text-xs font-semibold text-foreground">
                  ASAAS GESTÃO FINANCEIRA INSTITUIÇÃO DE PAGAMENTOS S.A.
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Autorizada pelo Banco Central do Brasil para processamento, abertura de contas de pagamento e liquidação.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <FileText className="size-4 text-primary" />
                  Papel da Plataforma
                </span>
                <p className="text-xs font-semibold text-foreground">
                  Integradora Tecnológica
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Distribuidora da experiência do produto e software. Não realiza intermediação em nome próprio.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/30 border border-border/60 space-y-1.5">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Phone className="size-4 text-primary" />
                  Canais Oficiais Asaas
                </span>
                <p className="text-xs font-semibold text-foreground">
                  0800 009 0037 • contato@asaas.com.br
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Suporte telefônico e mensagens (WhatsApp) para Pessoa Jurídica e clientes finais.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <p className="text-xs font-bold text-foreground">
                  Selos Homologados do Asaas Integrados à Plataforma
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Os selos nas versões Positivo (Claro), Preto (Neutro) e Negativo (Escuro) são exibidos automaticamente nos modais, relatórios e rodapé.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <a
                  href="/public/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3.5 py-2 rounded-xl bg-background border border-border/60 shadow-xs"
                >
                  <FileText className="size-3.5" />
                  <span>Ver Termos BaaS Completos</span>
                  <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes do Evento do Webhook */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
          <DialogContent className="w-[95vw] sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-6 bg-card border-border shadow-2xl space-y-4">
            <DialogHeader className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Activity className="size-4" />
                </div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Detalhes do Evento Webhook
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Dados recebidos do gateway Asaas em tempo real
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex justify-between items-center flex-wrap gap-2">
                <span className="text-muted-foreground font-semibold">Evento:</span>
                <Badge variant="outline" className="font-mono text-xs font-bold text-primary">
                  {selectedEvent.event}
                </Badge>
              </div>

              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex justify-between items-center flex-wrap gap-2">
                <span className="text-muted-foreground font-semibold">Horário de Recepção:</span>
                <span className="font-mono text-foreground">
                  {new Date(selectedEvent.created_at).toLocaleString("pt-BR")}
                </span>
              </div>

              {selectedEvent.asaas_payment_id && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 flex justify-between items-center flex-wrap gap-2">
                  <span className="text-muted-foreground font-semibold">ID do Pagamento:</span>
                  <span className="font-mono text-foreground font-bold">
                    {selectedEvent.asaas_payment_id}
                  </span>
                </div>
              )}

              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground">
                    Payload Completo (JSON)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs gap-1 text-primary hover:text-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedEvent.payload, null, 2));
                      toast.success("JSON copiado para a área de transferência!");
                    }}
                  >
                    <Copy className="size-3" />
                    <span>Copiar JSON</span>
                  </Button>
                </div>
                <pre className="max-h-60 overflow-auto rounded-xl p-3 bg-muted/40 border border-border/60 text-[11px] font-mono text-foreground leading-relaxed whitespace-pre-wrap break-all">
                  {JSON.stringify(selectedEvent.payload, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border/40">
              <AsaasFormSeal />
              <Button variant="outline" onClick={() => setSelectedEvent(null)} className="rounded-xl px-5">
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-foreground/85">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-background rounded-xl h-10 border-border/75 focus-visible:ring-primary/20"
      />
      {hint && <p className="text-[11px] text-muted-foreground leading-relaxed">{hint}</p>}
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof QrCode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3.5 p-4 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/30 transition-colors h-full">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <Icon className="size-4.5" />
      </span>
      <div className="space-y-1">
        <p className="font-bold text-xs text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  );
}
