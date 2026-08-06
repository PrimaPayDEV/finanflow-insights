export const BRL = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

export const PCT = (v: number | null | undefined) =>
  `${Number(v ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

export const MODALITIES = [
  { value: "pix", label: "Pix" },
  { value: "debit", label: "Débito" },
  { value: "credit_vista", label: "Crédito à Vista" },
  { value: "credit_installment", label: "Crédito Parcelado" },
  { value: "cash", label: "Dinheiro" },
] as const;

export type Modality = (typeof MODALITIES)[number]["value"];

export const modalityLabel = (m: string) =>
  MODALITIES.find((x) => x.value === m)?.label ?? m;

export const rateFieldByModality: Record<Modality, string> = {
  pix: "pix_rate",
  debit: "debit_rate",
  credit_vista: "credit_vista_rate",
  credit_installment: "credit_installment_rate",
  cash: "cash_rate",
};

export function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthOptions(count = 12) {
  const out: string[] = [];
  const d = new Date();
  for (let i = 0; i < count; i++) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    d.setMonth(d.getMonth() - 1);
  }
  return out;
}

export function monthLabel(m: string) {
  const [y, mo] = m.split("-");
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${names[Number(mo) - 1] ?? mo}/${y}`;
}

export const closureStatusLabel: Record<string, string> = {
  draft: "Rascunho",
  closed: "Fechado",
  invoice_generated: "Cobrança gerada",
  paid: "Pago",
};

export function formatCpfCnpj(value: string) {
  const v = value.replace(/\D/g, "");
  if (v.length <= 11) {
    return v
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
      .slice(0, 14);
  }
  return v
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .slice(0, 18);
}

export function formatPhone(value: string) {
  const v = value.replace(/\D/g, "");
  if (v.length <= 10) {
    return v
      .replace(/^(\d{2})(\d)/g, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2")
      .slice(0, 14);
  }
  return v
    .replace(/^(\d{2})(\d)/g, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .slice(0, 15);
}
