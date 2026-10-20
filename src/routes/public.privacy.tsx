import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, Phone, Mail, ArrowLeft, ExternalLink, FileText, CheckCircle2 } from "lucide-react";
import { AsaasBaasSeal } from "@/components/AsaasBaasSeal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/public/privacy")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade e Conformidade BaaS Asaas" },
      {
        name: "description",
        content:
          "Termos de uso, política de privacidade e informações regulatórias de Banking as a Service (BaaS) operado pelo Asaas em conformidade com a Resolução Conjunta nº 16/2025 do Banco Central do Brasil.",
      },
      { property: "og:title", content: "Política de Privacidade e Conformidade BaaS Asaas" },
      { property: "og:description", content: "Diretrizes de proteção de dados e divisão de responsabilidades financeiras BaaS Asaas." },
    ],
  }),
  component: PrivacyAndBaaSTermsPage,
});

function PrivacyAndBaaSTermsPage() {
  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 text-foreground py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
          <div className="flex items-center gap-3">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2 rounded-xl text-xs font-semibold">
                <ArrowLeft className="size-4" />
                Voltar à Plataforma
              </Button>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <AsaasBaasSeal variant="auto" size="md" />
          </div>
        </div>

        {/* Hero Section */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <ShieldCheck className="size-4" />
            Conformidade com a Resolução Conjunta nº 16/2025 do Banco Central do Brasil
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Política de Privacidade e Termos de Operação BaaS
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Esclarecimento transparente sobre o papel da nossa plataforma como integradora tecnológica e a atuação
            do Asaas como instituição de pagamento responsável pela infraestrutura e liquidação de serviços financeiros.
          </p>
        </div>

        {/* Cláusula Regulatória Principal (Slide 11 do Playbook Asaas) */}
        <Card className="rounded-3xl border-2 border-primary/20 bg-card shadow-lg shadow-primary/5 overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2.5 text-primary">
              <FileText className="size-5" />
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Cláusula Contratual: Prestação de Serviços Financeiros
              </h2>
            </div>
            <Separator />
            <div className="space-y-4 text-xs sm:text-sm text-foreground/90 leading-relaxed">
              <p className="p-4 rounded-2xl bg-muted/40 border border-border/60 font-medium">
                Os serviços financeiros e de pagamentos disponibilizados por meio da presente plataforma, incluindo abertura
                e manutenção de conta de pagamento, processamento de transações, emissão de boletos, transferências,
                pagamentos e demais movimentações de valores, são prestados pelo{" "}
                <strong className="text-foreground font-black">
                  ASAAS GESTÃO FINANCEIRA INSTITUIÇÃO DE PAGAMENTOS S.A.
                </strong>
                , instituição de pagamento autorizada a funcionar pelo Banco Central do Brasil.
              </p>
              <p>
                A nossa empresa atua exclusivamente como <strong className="font-semibold text-foreground">integradora tecnológica e distribuidora da experiência do produto</strong>, não sendo instituição financeira ou de pagamento, nem realizando intermediação financeira em nome próprio.
              </p>
              <p>
                O cliente declara ciência de que o relacionamento financeiro/de pagamentos e a responsabilidade regulatória pelos serviços acima descritos são do <strong className="font-semibold text-foreground">ASAAS GESTÃO FINANCEIRA S.A.</strong>, nos termos da regulamentação vigente estabelecida pelo Conselho Monetário Nacional e pelo Banco Central do Brasil.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Divisão de Papéis e Responsabilidades (Slide 15) */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-primary">
                <CheckCircle2 className="size-5" />
                <h3 className="font-bold text-sm text-foreground">
                  Responsabilidades do Asaas (Prestador BaaS)
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
                <li>Processamento e liquidação das operações financeiras de pagamentos e transferências.</li>
                <li>Conformidade com normas de Prevenção à Lavagem de Dinheiro e Financiamento ao Terrorismo (PLD/FT).</li>
                <li>Processos de identificação e validação de titularidade (Know Your Customer - KYC).</li>
                <li>Prevenção a fraudes, monitoramento e guarda prudencial dos recursos em conta regulada.</li>
                <li>Abertura, custódia e encerramento de contas de pagamento perante o Sistema Financeiro Nacional (SFN).</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lock className="size-5 text-primary" />
                <h3 className="font-bold text-sm text-foreground">
                  Papel da Nossa Plataforma (Tomador BaaS)
                </h3>
              </div>
              <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed list-disc list-inside">
                <li>Disponibilização da plataforma de software, dashboards e relatórios gerenciais integrados.</li>
                <li>Conexão de APIs seguras para facilitação da jornada operacional do cliente final.</li>
                <li>Transparência contínua com a inserção dos selos oficiais do Asaas em todos os fluxos financeiros.</li>
                <li>Suporte ao usuário quanto ao uso das funcionalidades e usabilidade do sistema de gestão.</li>
                <li>Vedação expressa de apresentação como instituição financeira ou cobrança de tarifas em nome próprio.</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Política de Privacidade e Proteção de Dados (LGPD) */}
        <Card className="rounded-3xl border border-border/80 bg-card shadow-xs">
          <CardContent className="p-6 sm:p-8 space-y-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              Privacidade e Tratamento de Dados (LGPD - Lei 13.709/2018)
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-muted-foreground leading-relaxed">
              <p>
                Os dados cadastrais coletados para a abertura de subcontas e emissão de cobranças (como Nome/Razão Social, CPF/CNPJ, E-mail, Telefone e Endereço) são tratados em estrita observância à Lei Geral de Proteção de Dados (LGPD).
              </p>
              <p>
                Esses dados são transmitidos de forma criptografada para o <strong className="text-foreground">Asaas Gestão Financeira Instituição de Pagamentos S.A.</strong> exclusivamente para viabilizar as rotinas de conformidade financeira, KYC e obrigações legais impostas pelo Banco Central do Brasil.
              </p>
              <p>
                Não comercializamos dados de clientes. O acesso a credenciais, tokens de API e relatórios é restrito aos administradores autorizados do respectivo estabelecimento cadastrado.
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Canais de Atendimento e Suporte (Slide 16 do Playbook Asaas) */}
        <Card className="rounded-3xl border-2 border-primary/20 bg-primary/5 shadow-xs">
          <CardContent className="p-6 sm:p-8 space-y-4">
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-primary flex items-center gap-2">
              <Phone className="size-5" />
              Canais Oficiais de Suporte ao Cliente Final
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Em caso de dúvidas operacionais relacionadas exclusivamente às movimentações financeiras, liquidações ou
              bloqueios regulatórios, o cliente final pode acionar os canais diretos do prestador financeiro:
            </p>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <a
                href="tel:08000090037"
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/80 hover:border-primary transition-all text-foreground"
              >
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Phone className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">0800 009 0037</p>
                  <p className="text-[11px] text-muted-foreground">Telefone PJ e WhatsApp (Mensagens)</p>
                </div>
              </a>

              <a
                href="mailto:contato@asaas.com.br"
                className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border/80 hover:border-primary transition-all text-foreground"
              >
                <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-bold">contato@asaas.com.br</p>
                  <p className="text-[11px] text-muted-foreground">Atendimento oficial Asaas por e-mail</p>
                </div>
              </a>
            </div>

            <div className="pt-2 text-center">
              <a
                href="https://asaas.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1.5"
              >
                Acessar portal institucional do Asaas Gestão Financeira
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-4 pb-12 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} • Plataforma Tecnológica em conformidade com o Banco Central do Brasil.</p>
        </div>
      </div>
    </div>
  );
}
