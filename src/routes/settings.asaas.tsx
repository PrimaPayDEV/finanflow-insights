import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldCheck, TriangleAlert, Split, QrCode } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkAsaasConfigured } from "@/lib/asaas.functions";

export const Route = createFileRoute("/settings/asaas")({
  head: () => ({
    meta: [
      { title: "Configuração Asaas | Gestão de ECs" },
      {
        name: "description",
        content:
          "Status da integração com o Asaas: chave de API armazenada com segurança no backend, split de pagamento e boleto com Pix híbrido.",
      },
      { property: "og:title", content: "Configuração Asaas" },
      {
        property: "og:description",
        content: "Integração de cobrança automática com split e boleto Pix híbrido.",
      },
    ],
  }),
  component: AsaasSettings,
});

function AsaasSettings() {
  const check = useServerFn(checkAsaasConfigured);
  const status = useQuery({ queryKey: ["asaas-status"], queryFn: () => check({}) });
  const configured = status.data?.configured;

  return (
    <AppLayout title="Configuração Asaas" subtitle="Cobrança automática, split e boleto Pix híbrido">
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
              Para cadastrar ou trocar a chave, peça no chat: <em>“atualizar minha chave do Asaas”</em>.
              Um formulário seguro será aberto para você colar o valor.
            </p>
            <p className="text-xs">
              Você encontra a chave no painel do Asaas em Configurações da conta → Integrações → Chave
              de API.
            </p>
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
              text="Cada fechamento aprovado gera um POST /v3/payments com boleto e QR Code Pix no mesmo documento."
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
              O sistema está operando em <strong>Produção (Conta Real)</strong>. As cobranças emitidas serão válidas.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
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
