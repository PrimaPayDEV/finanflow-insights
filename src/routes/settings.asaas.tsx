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
  const qc = useQueryClient();
  const check = useServerFn(checkAsaasConfigured);
  const status = useQuery({ queryKey: ["asaas-status"], queryFn: () => check({}) });
  const settings = useQuery(asaasSettingsQuery);
  const events = useQuery(asaasEventsQuery);
  const configured = status.data?.configured;

  const [form, setForm] = useState(defaults);

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

  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/asaas-webhook` : "";

  return (
    <AppLayout title="Configuração Asaas" subtitle="Preferências de cobrança, split e sincronização">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" /> Chave de API
            </CardTitle>
            {status.isLoading ? (
              <Badge variant="secondary">verificando…</Badge>
            ) : configured ? (
              <Badge>
                <ShieldCheck className="size-3.5" /> Configurada
              </Badge>
            ) : (
              <Badge variant="destructive">
                <TriangleAlert className="size-3.5" /> Não configurada
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              A chave da API do Asaas é guardada como segredo no backend (nunca no navegador nem no
              banco de dados) e usada apenas pelo servidor ao criar as cobranças.
            </p>
            <p>
              Para trocar a chave, peça no chat: <em>“atualizar minha chave do Asaas”</em>.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Save className="size-4" /> Preferências de cobrança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Dia de vencimento"
                value={form.due_day}
                onChange={(v) => setForm({ ...form, due_day: Number(v) })}
                type="number"
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

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Ambiente sandbox</p>
                <p className="text-xs text-muted-foreground">
                  Ativado: cobranças de teste. Desativado: produção (conta real).
                </p>
              </div>
              <Switch
                checked={form.sandbox}
                onCheckedChange={(v) => setForm({ ...form, sandbox: v })}
              />
            </div>

            <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full">
              <Save className="size-4" /> Salvar preferências
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Webhook className="size-4" /> Sincronização de status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Cadastre esta URL no Asaas em <strong>Integrações → Webhooks</strong> para que os
              fechamentos sejam marcados como pagos automaticamente.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl);
                  toast.success("URL copiada");
                }}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-xs">
              Recomendado: no Asaas, defina um <strong>token de autenticação</strong> do webhook e
              peça no chat “cadastrar o token do webhook do Asaas” para guardá-lo no backend.
              {status.data?.webhookTokenConfigured ? " (token já configurado)" : ""}
            </p>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">Últimos eventos recebidos</p>
              {events.data?.length ? (
                events.data.slice(0, 6).map((e) => (
                  <p key={e.id} className="text-xs">
                    {new Date(e.created_at).toLocaleString("pt-BR")} — {e.event}
                  </p>
                ))
              ) : (
                <p className="text-xs">Nenhum evento recebido ainda.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Como a cobrança é criada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Feature
              icon={QrCode}
              title="Boleto com Pix híbrido"
              text="Cada fechamento aprovado gera uma cobrança com boleto e QR Code Pix no mesmo documento, usando as preferências acima."
            />
            <Feature
              icon={Split}
              title="Split de pagamento"
              text="As regras de split do EC (Wallet ID + % do parceiro) são enviadas junto da cobrança e o repasse é automático."
            />
            <Feature
              icon={ShieldCheck}
              title="Cliente automático"
              text="O EC é localizado pelo CNPJ no Asaas e criado automaticamente caso ainda não exista."
            />
            <p className="rounded-lg border border-primary/20 bg-primary/10 p-3 text-xs text-primary">
              Ambiente atual:{" "}
              <strong>{form.sandbox ? "Sandbox (teste)" : "Produção (conta real)"}</strong>.
            </p>
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
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
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
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

