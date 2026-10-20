import { useState } from "react";
import { ShieldCheck, HelpCircle, Phone, Mail, ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export const ASAAS_SEALS = {
  positivo:
    "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Positivo.svg?id=d5013074-870a-43b1-9631-92ca8081495e",
  preto:
    "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Preto.svg?id=d5013074-870a-43b1-9631-92ca8081495e",
  branco:
    "https://baas.asaas.com/selos/Servicos_financeiros_Asaas-Reduzida-Negativo-Branco.svg?id=d5013074-870a-43b1-9631-92ca8081495e",
} as const;

export interface AsaasBaasSealProps {
  /**
   * "auto": alternância automática via CSS (Positivo no modo claro, Negativo-Branco no modo escuro)
   * "positivo": logo oficial colorido (fundo claro/destaque azul)
   * "preto": logo monocromático preto (fundo claro monocromático)
   * "branco": logo monocromático branco (fundo escuro/dark mode)
   */
  variant?: "auto" | "positivo" | "preto" | "branco";
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  isLink?: boolean;
}

const sizeStyles = {
  xs: { width: 110, height: 33, className: "w-[110px] h-[33px]" },
  sm: { width: 130, height: 39, className: "w-[130px] h-[39px]" },
  md: { width: 150, height: 45, className: "w-[150px] h-[45px]" },
  lg: { width: 160, height: 48, className: "w-[160px] h-[48px]" },
};

/**
 * Componente do Selo Oficial BaaS do Asaas em estrita conformidade com o Playbook BaaS.
 * NOTA CRÍTICA DE REGULAÇÃO: Nunca utilizar 'referrerpolicy="no-referrer"' na tag <img>,
 * pois o Asaas valida a origem via HTTP Referer para fins de compliance regulatório.
 */
export function AsaasBaasSeal({
  variant = "auto",
  size = "md",
  className,
  isLink = true,
}: AsaasBaasSealProps) {
  const currentSize = sizeStyles[size];

  const renderImage = (src: string, extraClass = "") => (
    <img
      src={src}
      alt="Serviços financeiros prestados por Asaas"
      width={currentSize.width}
      height={currentSize.height}
      className={cn("object-contain select-none transition-opacity", currentSize.className, extraClass)}
      style={{ display: "inline-block" }}
    />
  );

  let content: React.ReactNode;

  if (variant === "positivo") {
    content = renderImage(ASAAS_SEALS.positivo);
  } else if (variant === "preto") {
    content = renderImage(ASAAS_SEALS.preto);
  } else if (variant === "branco") {
    content = renderImage(ASAAS_SEALS.branco);
  } else {
    // "auto": Positivo no tema claro e Negativo-Branco no tema escuro
    content = (
      <>
        {renderImage(ASAAS_SEALS.positivo, "block dark:hidden")}
        {renderImage(ASAAS_SEALS.branco, "hidden dark:block")}
      </>
    );
  }

  if (isLink) {
    return (
      <a
        href="https://asaas.com"
        target="_blank"
        rel="noopener noreferrer"
        title="Serviços financeiros operados pelo Asaas - Saiba mais"
        className={cn(
          "inline-flex items-center justify-center hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary/40 rounded-lg",
          className
        )}
      >
        {content}
      </a>
    );
  }

  return <div className={cn("inline-flex items-center justify-center", className)}>{content}</div>;
}

/**
 * Modal explicativo oficial de conformidade BaaS do Asaas (Resolução Conjunta nº 16/2025 BACEN)
 */
export function AsaasLegalModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 bg-card border-border shadow-2xl">
        <DialogHeader className="space-y-2 pb-2 border-b border-border/60">
          <div className="flex items-center justify-between gap-4">
            <AsaasBaasSeal variant="auto" size="sm" isLink={false} />
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              <ShieldCheck className="size-3.5" />
              Resolução Conjunta nº 16/2025 BACEN
            </span>
          </div>
          <DialogTitle className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight pt-2">
            Prestação de Serviços Financeiros e Banking as a Service (BaaS)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Transparência e responsabilidade regulatória perante o Banco Central do Brasil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 text-xs leading-relaxed text-foreground/90">
          {/* Cláusula Contratual Oficial */}
          <div className="rounded-2xl bg-muted/40 p-4 border border-border/60 space-y-3">
            <p className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Info className="size-4" />
              Cláusula Contratual de Prestação de Serviços Financeiros
            </p>
            <p className="text-[13px] leading-relaxed text-foreground">
              Os serviços financeiros e de pagamentos disponibilizados por meio da presente plataforma,
              incluindo abertura e manutenção de conta de pagamento, processamento de transações, emissão de
              boletos, transferências, pagamentos e demais movimentações de valores, são prestados pelo{" "}
              <strong className="text-foreground font-bold">
                ASAAS GESTÃO FINANCEIRA INSTITUIÇÃO DE PAGAMENTOS S.A.
              </strong>
              , instituição de pagamento autorizada a funcionar pelo Banco Central do Brasil.
            </p>
            <p className="text-[13px] leading-relaxed text-foreground">
              A nossa empresa atua exclusivamente como <strong className="font-bold">integradora tecnológica e distribuidora da experiência do produto</strong>,
              não sendo instituição financeira ou de pagamento, nem realizando intermediação financeira em nome próprio.
            </p>
            <p className="text-[13px] leading-relaxed text-foreground">
              O cliente declara ciência de que o relacionamento financeiro/de pagamentos e a responsabilidade
              regulatória pelos serviços acima descritos são do <strong className="font-bold">ASAAS GESTÃO FINANCEIRA S.A.</strong>,
              nos termos da regulamentação vigente.
            </p>
          </div>

          {/* Divisão de Responsabilidades */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1.5">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-primary" />
                Responsabilidade do Asaas (Prestador)
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Segurança de toda a operação financeira de pagamentos, conformidade PLD/FT (Prevenção à Lavagem de Dinheiro),
                KYC (Conheça seu Cliente) e prevenção a fraudes regulatórias do BACEN.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-1.5">
              <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                <Info className="size-4 text-muted-foreground" />
                Papel da Plataforma (Tomador BaaS)
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Disponibilização da plataforma de software, interface de gestão, relatórios e suporte operacional tecnológico integrado.
              </p>
            </div>
          </div>

          {/* Canais de Suporte Oficiais do Asaas */}
          <div className="rounded-2xl p-4 bg-primary/5 border border-primary/20 space-y-2.5">
            <p className="font-bold text-xs text-primary flex items-center gap-1.5">
              <Phone className="size-4" />
              Canais Oficiais de Suporte Asaas
            </p>
            <p className="text-[11px] text-muted-foreground">
              Para dúvidas ou solicitações específicas sobre suas operações financeiras, você também pode contatar diretamente a instituição financeira parceira:
            </p>
            <div className="grid sm:grid-cols-2 gap-2 pt-1 font-mono text-xs">
              <a
                href="tel:08000090037"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary transition-colors text-foreground"
              >
                <Phone className="size-3.5 text-primary" />
                <span>0800 009 0037</span>
              </a>
              <a
                href="mailto:contato@asaas.com.br"
                className="flex items-center gap-2 p-2.5 rounded-xl bg-background border border-border/60 hover:border-primary transition-colors text-foreground"
              >
                <Mail className="size-3.5 text-primary" />
                <span>contato@asaas.com.br</span>
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60">
          <a
            href="/public/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
          >
            Ver Política de Privacidade & Termos Completos
            <ExternalLink className="size-3" />
          </a>
          <Button onClick={() => onOpenChange(false)} className="rounded-xl px-5 text-xs font-bold w-full sm:w-auto">
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Componente do Selo para ser usado no rodapé de Modais/Diálogos financeiros (ex: Criar subconta, Nova Fatura, etc.)
 * exatamente como no Slide 10 do Playbook BaaS Asaas.
 */
export function AsaasModalSeal({
  variant = "auto",
  className,
}: {
  variant?: "auto" | "positivo" | "preto" | "branco";
  className?: string;
}) {
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <>
      <div className={cn("flex items-center gap-2.5 text-left", className)}>
        <AsaasBaasSeal variant={variant} size="xs" />
        <button
          type="button"
          onClick={() => setLegalOpen(true)}
          className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 underline underline-offset-2"
          title="Ver informações regulatórias do Asaas"
        >
          <span>Regulação BACEN</span>
          <HelpCircle className="size-3 shrink-0" />
        </button>
      </div>

      <AsaasLegalModal open={legalOpen} onOpenChange={setLegalOpen} />
    </>
  );
}

/**
 * Rodapé global de conformidade BaaS do Asaas
 */
export function AsaasBaasFooterDisclosure({
  className,
}: {
  className?: string;
}) {
  const [legalOpen, setLegalOpen] = useState(false);

  return (
    <>
      <footer
        className={cn(
          "w-full mt-10 pt-6 pb-6 border-t border-border/50 text-xs text-muted-foreground print:hidden",
          className
        )}
      >
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AsaasBaasSeal variant="auto" size="sm" />
            <div className="text-[11px] leading-tight text-muted-foreground max-w-xl">
              <p>
                Serviços financeiros operados por{" "}
                <strong className="text-foreground font-semibold">
                  ASAAS GESTÃO FINANCEIRA INSTITUIÇÃO DE PAGAMENTO S.A.
                </strong>
                , autorizada pelo Banco Central do Brasil.
              </p>
              <p className="text-[10px] text-muted-foreground/80 mt-0.5">
                Em conformidade com a Resolução Conjunta nº 16/2025 do Banco Central do Brasil.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <button
              type="button"
              onClick={() => setLegalOpen(true)}
              className="hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Termos e Responsabilidades
            </button>
            <span className="text-border">•</span>
            <a
              href="/public/privacy"
              className="hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Política de Privacidade
            </a>
            <span className="text-border">•</span>
            <a
              href="tel:08000090037"
              className="hover:text-foreground transition-colors inline-flex items-center gap-1"
              title="Suporte Asaas"
            >
              <Phone className="size-3 text-primary" />
              <span>0800 009 0037</span>
            </a>
          </div>
        </div>
      </footer>

      <AsaasLegalModal open={legalOpen} onOpenChange={setLegalOpen} />
    </>
  );
}
