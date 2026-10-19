import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, TriangleAlert, Split, QrCode, Save, Webhook, Copy } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
  const { companyId } = useAuth();
  const qc = useQueryClient();
  const check = useServerFn(checkAsaasConfigured);
  const status = useQuery({ queryKey: ["asaas-status", companyId], queryFn: () => check({ data: { companyId: companyId! } }) });
  const settings = useQuery(asaasSettingsQuery);
  const events = useQuery(asaasEventsQuery);
  const configured = status.data?.configured;

  const [form, setForm] = useState(defaults);
  const [apiKey, setApiKey] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [webhookToken, setWebhookToken] = useState("");
  const [savingWebhookToken, setSavingWebhookToken] = useState(false);

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
      toast.success("Preferências de cobrança salvas");
      qc.invalidateQueries({ queryKey: ["asaas_settings"] });
    },
    onError: (e: Error) => toast.error(translateError(e.message)),
  });

  const saveApiKey = async () => {
    if (!companyId) return;
    if (!apiKey.trim()) return toast.error("Insira uma chave válida");
    
    setSavingKey(true);
    try {
      const { error } = await supabase.from("companies").update({ asaas_api_key: apiKey.trim() }).eq("id", companyId);
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
      const { error } = await supabase.from("companies").update({ asaas_webhook_token: webhookToken.trim() }).eq("id", companyId);
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

  const webhookUrl =
    companyId ? `https://primahubec.lovable.app/api/public/asaas-webhook?company_id=${companyId}` : "";

  return (
    <AppLayout title="Configuração Asaas" subtitle="Preferências de cobrança, split e sincronização">
      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <KeyRound className="size-4" />
              </div>
              Chave de API Asaas
            </CardTitle>
            {status.isLoading ? (
              <Badge variant="secondary" className="font-mono text-xs">verificando…</Badge>
            ) : configured ? (
              <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 text-xs font-semibold gap-1">
                <ShieldCheck className="size-3.5" /> Configurada
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-xs font-semibold gap-1">
                <TriangleAlert className="size-3.5" /> Não configurada
              </Badge>
            )}
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-sm">
            <p className="text-xs text-muted-foreground">
              Insira a chave da sua API do Asaas para integrar a plataforma. Certifique-se de usar a chave correspondente ao ambiente correto (Produção ou Sandbox).
            </p>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="Ex: $aact_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono text-xs bg-background"
              />
              <Button onClick={saveApiKey} disabled={savingKey || !apiKey.trim()} className="shrink-0 shadow-2xs">
                Salvar Chave
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Save className="size-4" />
              </div>
              Preferências de Cobrança
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="grid gap-3.5 sm:grid-cols-2">
              <Field
                label="Dia de vencimento"
                value={form.due_day}
                onChange={(v) => setForm({ ...form, due_day: Number(v) })}
                type="number"
                hint="Se cair em fim de semana ou feriado, prorroga automaticamente para o próximo dia útil."
              />
              <Field
                label="Multa após vencimento (%)"
                value={form.fine_percent}
                onChange={(v) => setForm({ ...form, fine_percent: Number(v) })}
                type="number"
              />
              <Field
                label="Juros ao mês (%)"
                value={form.interest_percent}
                onChange={(v) => setForm({ ...form, interest_percent: Number(v) })}
                type="number"
              />
              <Field
                label="Desconto (%)"
                value={form.discount_percent}
                onChange={(v) => setForm({ ...form, discount_percent: Number(v) })}
                type="number"
              />
              <Field
                label="Desconto até X dias antes"
                value={form.discount_deadline_days}
                onChange={(v) => setForm({ ...form, discount_deadline_days: Number(v) })}
                type="number"
              />
              <Field
                label="Descrição padrão"
                value={form.default_description}
                onChange={(v) => setForm({ ...form, default_description: v })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/60">
              <div>
                <p className="text-xs font-bold text-foreground">Ambiente Sandbox (Testes)</p>
                <p className="text-[11px] text-muted-foreground">
                  Ativado: cobranças fictícias. Desativado: produção com dinheiro real.
                </p>
              </div>
              <Switch
                checked={form.sandbox}
                onCheckedChange={(v) => setForm({ ...form, sandbox: v })}
              />
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full gap-2 shadow-xs">
              <Save className="size-4" />
              <span>Salvar Preferências</span>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Webhook className="size-4" />
              </div>
              Sincronização de Status (Webhook)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-sm text-muted-foreground">
            <p className="text-xs">
              Cadastre esta URL no Asaas em <strong>Integrações → Webhooks</strong> para que as
              faturas sejam sincronizadas e marcadas como pagas automaticamente.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs bg-muted/30" />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("URL copiada!");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <div className="space-y-2 mt-4 pt-3 border-t">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Token de Autenticação do Webhook</p>
                <Badge variant={status.data?.webhookTokenConfigured ? "outline" : "secondary"} className="text-[10px]">
                  {status.data?.webhookTokenConfigured ? "Token ativo" : "Não configurado"}
                </Badge>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Token do Webhook"
                  value={webhookToken}
                  onChange={(e) => setWebhookToken(e.target.value)}
                  className="font-mono text-xs bg-background"
                />
                <Button onClick={saveWebhookToken} disabled={savingWebhookToken || !webhookToken.trim()} className="shrink-0 shadow-2xs">
                  Salvar
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 pt-3 border-t">
              <p className="text-xs font-bold text-foreground">Últimos Eventos Recebidos</p>
              {events.data?.length ? (
                <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px] bg-muted/20 p-2.5 rounded-xl border">
                  {events.data.slice(0, 6).map((e) => (
                    <p key={e.id} className="text-muted-foreground truncate">
                      <span className="text-foreground font-semibold">{new Date(e.created_at).toLocaleTimeString("pt-BR")}</span> — {e.event}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum evento recebido ainda.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border border-border/80 shadow-card bg-card overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-border/60">
            <CardTitle className="text-base font-bold">Como a Cobrança Funciona</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4 text-sm">
            <Feature
              icon={QrCode}
              title="Boleto com Pix Híbrido"
              text="Cada fechamento aprovado gera uma cobrança com boleto bancário e QR Code Pix no mesmo documento."
            />
            <Feature
              icon={Split}
              title="Split Automático de Pagamento"
              text="As regras de split do EC (Wallet ID + % do parceiro) são enviadas junto da cobrança para repasse automático no Asaas."
            />
            <Feature
              icon={ShieldCheck}
              title="Cadastro Automático do Cliente"
              text="O EC é localizado pelo CNPJ no Asaas e criado automaticamente caso ainda não exista."
            />
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary font-medium flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 text-[10px]">Ambiente</Badge>
              <span>Atualmente em <strong>{form.sandbox ? "Sandbox (Ambiente de Testes)" : "Produção (Conta Oficial)"}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>
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
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="bg-background rounded-xl" />
      {hint && <p className="text-[11px] text-muted-foreground leading-tight">{hint}</p>}
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
    <div className="flex gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="font-bold text-xs text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

