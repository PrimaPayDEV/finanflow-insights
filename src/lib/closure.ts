import type { Expense, FeePlan, PosTerminal, Transaction } from "@/lib/db";
import { MODALITIES, rateFieldByModality, type Modality } from "@/lib/format";

export type TerminalBillingItem = {
  id: string;
  terminalId?: string;
  serialNumber: string;
  model?: string;
  description: string;
  amount: number; // 100 se cobrada, 0 se isenta
  isExempt: boolean;
  requiredGross: number; // 50000 para a 1ª, 80000 para a 2ª, 110000 para a 3ª, etc.
};

export type TerminalBillingSummary = {
  totalTerminals: number;
  exemptTerminals: number;
  chargedTerminals: number;
  terminalPrice: number; // 100
  totalCharge: number; // chargedTerminals * 100
  totalSavings: number; // exemptTerminals * 100
  items: TerminalBillingItem[];
  nextExemptionTarget: number | null;
  remainingForNextExemption: number | null;
};

export const TERMINAL_PRICE = 100;
export const TERMINAL_FIRST_TIER = 50000;
export const TERMINAL_STEP_TIER = 30000;

export function calculateTerminalBilling(
  terminals: PosTerminal[] = [],
  totalGross: number = 0,
): TerminalBillingSummary {
  const totalTerminals = terminals.length;
  if (totalTerminals === 0) {
    return {
      totalTerminals: 0,
      exemptTerminals: 0,
      chargedTerminals: 0,
      terminalPrice: TERMINAL_PRICE,
      totalCharge: 0,
      totalSavings: 0,
      items: [],
      nextExemptionTarget: null,
      remainingForNextExemption: null,
    };
  }

  // Regra de Isenção:
  // - Atingindo R$ 50.000 de faturamento => 1ª maquininha isenta
  // - A cada R$ 30.000 adicionais => ganha isenção de mais uma maquininha
  let availableExemptions = 0;
  if (totalGross >= TERMINAL_FIRST_TIER) {
    availableExemptions = 1 + Math.floor((totalGross - TERMINAL_FIRST_TIER) / TERMINAL_STEP_TIER);
  }

  const exemptTerminals = Math.min(totalTerminals, availableExemptions);
  const chargedTerminals = Math.max(0, totalTerminals - exemptTerminals);
  const totalCharge = chargedTerminals * TERMINAL_PRICE;
  const totalSavings = exemptTerminals * TERMINAL_PRICE;

  const items: TerminalBillingItem[] = terminals.map((t, index) => {
    const requiredGross = TERMINAL_FIRST_TIER + index * TERMINAL_STEP_TIER;
    const isExempt = index < exemptTerminals;
    const serialInfo = t.serial_number ? ` (${t.serial_number})` : ` #${index + 1}`;

    const description = isExempt
      ? `Maquininha${serialInfo} — Isenção por Faturamento (Meta de R$ 50k+ atingida)`
      : `Maquininha${serialInfo} — Aluguel Mensal (Faturamento abaixo da meta de isenção)`;

    return {
      id: t.id || `term-${index}`,
      terminalId: t.id,
      serialNumber: t.serial_number || `Terminal #${index + 1}`,
      model: t.model || undefined,
      description,
      amount: isExempt ? 0 : TERMINAL_PRICE,
      isExempt,
      requiredGross,
    };
  });

  let nextExemptionTarget: number | null = null;
  let remainingForNextExemption: number | null = null;
  if (exemptTerminals < totalTerminals) {
    nextExemptionTarget = TERMINAL_FIRST_TIER + exemptTerminals * TERMINAL_STEP_TIER;
    remainingForNextExemption = Math.max(0, nextExemptionTarget - totalGross);
  }

  return {
    totalTerminals,
    exemptTerminals,
    chargedTerminals,
    terminalPrice: TERMINAL_PRICE,
    totalCharge,
    totalSavings,
    items,
    nextExemptionTarget,
    remainingForNextExemption,
  };
}

export type ClosureCalc = {
  grossByModality: Record<Modality, number>;
  feeByModality: Record<Modality, number>;
  totalGross: number;
  modalityFeeTotal: number;
  fixedFeeAmount: number;
  totalOpFee: number;
  totalExpenses: number;
  totalCharges: number;
  netInvoice: number;
  traditionalCost: number;
  savings: number;
  totalMerchantCost: number;
  appliedPrimaRate: number;
  appliedTraditionalRate: number;
  terminalSummary: TerminalBillingSummary;
};

export function inMonth(dateIso: string, month: string) {
  return dateIso.slice(0, 7) === month;
}

export function getTierRates(totalGross: number) {
  if (totalGross <= 15000) return { traditionalRate: 4.00, primaRate: 2.00 };
  if (totalGross <= 30000) return { traditionalRate: 7.30, primaRate: 2.50 };
  if (totalGross <= 60000) return { traditionalRate: 9.50, primaRate: 3.00 };
  if (totalGross <= 150000) return { traditionalRate: 10.70, primaRate: 3.50 };
  if (totalGross <= 300000) return { traditionalRate: 14.30, primaRate: 4.50 };
  return { traditionalRate: 19.00, primaRate: 5.50 };
}

const TRADITIONAL_RATES = {
  debit: 1.49,
  credit: [0, 4.50, 6.59, 7.38, 8.16, 8.94, 9.71, 12.47, 13.22, 13.97, 14.71, 15.43, 16.16, 17.61, 18.32, 19.02, 19.71, 20.39, 21.06],
  pix: 0.90
};

export function getTraditionalRate(t: Transaction, plan?: FeePlan): number {
  if (plan && (plan as any).traditional_fee_avg && (plan as any).traditional_fee_avg > 0) {
    return (plan as any).traditional_fee_avg;
  }

  if (t.modality === 'pix') return TRADITIONAL_RATES.pix;
  
  if (t.modality === 'debit') {
    return TRADITIONAL_RATES.debit;
  }
  
  const installments = t.installments || 1;
  if (installments >= 1 && installments <= 18) {
    return TRADITIONAL_RATES.credit[installments];
  }
  if (installments > 18) {
    return TRADITIONAL_RATES.credit[18]; // Fallback para > 18
  }
  return 0;
}

export type RateTableType = "CPAG59" | "CPAG56";

export const RATE_TABLE_OPTIONS = [
  { id: "CPAG59", label: "CPAG59 - F3", code: "F3" },
  { id: "CPAG56", label: "CPAG56 - F7", code: "F7" },
] as const;

export const CPAG59 = {
  vm: {
    debit: 1.36,
    credit: [0, 3.47, 5.08, 5.84, 6.60, 7.26, 8.11, 9.16, 9.91, 10.67, 11.43, 12.18, 12.94, 13.70, 14.45, 15.21, 15.97, 16.73, 17.48, 19.48, 21.48, 23.48]
  },
  elo: {
    debit: 2.35,
    credit: [0, 3.98, 6.17, 6.88, 7.58, 8.29, 8.99, 9.91, 10.66, 11.41, 12.16, 12.91, 13.66, 14.41, 15.16, 15.91, 16.66, 17.41, 18.16, 20.16, 22.16, 24.16]
  },
  hiper: {
    debit: 0,
    credit: [0, 3.98, 5.96, 6.71, 7.58, 8.21, 8.97, 9.91, 10.66, 11.41, 12.16, 12.91, 13.66, 14.41, 15.16, 15.91, 16.66, 17.41, 18.16, 20.16, 22.16, 24.16]
  },
  amex: {
    debit: 0,
    credit: [0, 5.00, 6.37, 7.07, 7.78, 8.48, 9.18, 10.09, 10.84, 11.59, 12.34, 13.09, 13.84, 14.59, 15.34, 16.09, 16.84, 17.59, 18.13, 20.13, 22.13, 24.13]
  },
  cabal: {
    debit: 6.50,
    credit: [0, 8.17, 9.04, 9.77, 10.49, 11.22, 11.94, 12.80, 13.53, 14.25, 14.98, 15.70, 16.43, 17.15, 17.88, 18.60, 19.33, 20.05, 20.78, 22.78, 24.78, 26.78]
  },
  pix: 1.39
};

export const CPAG56 = {
  vm: {
    debit: 1.35,
    credit: [0, 3.57, 5.99, 6.49, 7.49, 7.99, 8.59, 9.59, 10.39, 11.09, 11.79, 12.49, 12.99, 14.69, 15.49, 16.09, 16.79, 17.49, 18.19, 18.49, 19.49, 20.49]
  },
  elo: {
    debit: 2.09,
    credit: [0, 4.02, 6.90, 7.66, 8.31, 9.07, 9.61, 10.49, 11.09, 11.79, 12.49, 13.19, 13.99, 14.69, 15.49, 16.09, 16.79, 17.49, 18.19, 19.19, 20.19, 21.19]
  },
  hiper: {
    debit: 0,
    credit: [0, 4.02, 6.69, 7.49, 8.31, 8.99, 9.59, 10.49, 11.09, 11.79, 12.49, 13.19, 13.99, 14.69, 15.49, 16.09, 16.79, 17.49, 18.19, 19.19, 20.19, 21.19]
  },
  amex: {
    debit: 0,
    credit: [0, 5.25, 7.91, 8.66, 9.32, 10.07, 10.61, 11.49, 12.09, 12.79, 13.49, 14.19, 14.99, 15.69, 16.49, 17.09, 17.79, 18.49, 19.19, 20.19, 21.19, 22.19]
  },
  cabal: {
    debit: 8.00,
    credit: [0, 9.00, 10.00, 11.00, 12.00, 13.00, 14.00, 15.00, 16.00, 17.00, 18.00, 19.00, 20.00, 21.00, 22.00, 23.00, 24.00, 25.00, 26.00, 27.00, 28.00, 29.00]
  },
  pix: 1.29
};

export function getReferenceTable(rateTableKey?: string) {
  const is56 = (rateTableKey || "").toUpperCase().includes("56") || (rateTableKey || "").toUpperCase().includes("F7");
  return is56 ? CPAG56 : CPAG59;
}

/**
 * Obtém a tabela de taxas ativa para um estabelecimento.
 * Prioriza o valor persistido no banco de dados; se a coluna ainda não existir no schema remoto,
 * consulta o cache local persistido (localStorage).
 */
export function getSavedMerchantRateTable(
  merchantId?: string,
  dbRateTable?: string | null
): "CPAG59" | "CPAG56" {
  if (dbRateTable === "CPAG56" || dbRateTable === "CPAG59") return dbRateTable;
  if (merchantId && typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem(`merchant_rate_table_${merchantId}`);
      if (saved === "CPAG56" || saved === "CPAG59") return saved;
    } catch {
      // ignore
    }
  }
  return "CPAG59";
}

/**
 * Determina qual tabela de taxas (CPAG59 - F3 ou CPAG56 - F7) deve ser aplicada a uma transação específica.
 * Lê a coluna "adquirente" da transação:
 * - Se a transação for em Pix e a adquirente indicar F6 (ou F3/59), aplica a tabela CPAG59 - F3 (Pix: 1.39%).
 * - Se a adquirente indicar F7 (cartão ou Pix), aplica a tabela CPAG56 - F7 (Pix: 1.29%).
 * - Caso a transação não especifique adquirente, utiliza a tabela ativa cadastrada no EC.
 */
export function resolveTransactionRateTable(
  t: Transaction,
  fallbackRateTableKey?: string
): "CPAG59" | "CPAG56" {
  const acq = String((t as any)?.acquirer || "").toUpperCase().trim();
  const isPix = t.modality === "pix";

  if (acq) {
    // Pix com adquirente F6 / F3 / CPAG59 -> sempre tabela CPAG59 - F3
    if (isPix && (acq.includes("F6") || acq.includes("F3") || acq.includes("CPAG59") || acq.includes("59"))) {
      return "CPAG59";
    }

    // Pix com adquirente F7 -> tabela CPAG56 - F7
    if (isPix && (acq.includes("F7") || acq.includes("CPAG56") || acq.includes("56"))) {
      return "CPAG56";
    }

    // Cartão com adquirente F7 -> tabela CPAG56 - F7
    if (acq.includes("F7") || acq.includes("CPAG56") || acq.includes("56")) {
      return "CPAG56";
    }

    // Cartão com adquirente F6 / F3 -> tabela CPAG59 - F3
    if (acq.includes("F6") || acq.includes("F3") || acq.includes("CPAG59") || acq.includes("59")) {
      return "CPAG59";
    }
  }

  // Fallback para a tabela contratual ativa do EC (verificando banco e cache local)
  return getSavedMerchantRateTable((t as any)?.merchant_id, fallbackRateTableKey);
}

/**
 * Identifica se a bandeira do cartão corresponde às bandeiras padrão Visa ou Master (incluindo Maestro e Pix genérico).
 * Se não informada, assume Visa/Master por padrão.
 */
export function isVisaOrMaster(brand?: string | null): boolean {
  if (!brand) return true;
  const b = brand.toLowerCase().trim();
  return (
    b.includes("visa") ||
    b.includes("master") ||
    b.includes("maestro") ||
    b === "vm" ||
    b === "pix"
  );
}

export type OtherBrandRates = {
  pix_rate?: number;
  debit_rate?: number;
  credit_vista_rate?: number;
  credit_installment_rate?: number;
  installment_rates?: Record<string, number>;
};

/**
 * Extrai as taxas personalizadas para Outras Bandeiras (Tabela 2) configuradas no plano do EC.
 * Lê de `plan.installment_rates.other_rates` (armazenamento JSON seguro) ou de campos diretos.
 * Se nenhum campo de Outras Bandeiras estiver preenchido com taxa positiva, retorna null.
 */
export function getOtherBrandRates(plan?: FeePlan | null): OtherBrandRates | null {
  if (!plan) return null;

  const inst = (plan as any).installment_rates;
  const jsonOther =
    inst && typeof inst === "object" && !Array.isArray(inst)
      ? (inst.other_rates as OtherBrandRates | undefined)
      : undefined;

  const rawPix = (plan as any).other_pix_rate ?? jsonOther?.pix_rate;
  const rawDebit = (plan as any).other_debit_rate ?? jsonOther?.debit_rate;
  const rawVista = (plan as any).other_credit_vista_rate ?? jsonOther?.credit_vista_rate;
  const rawInstRate = (plan as any).other_credit_installment_rate ?? jsonOther?.credit_installment_rate;
  const rawInsts = (plan as any).other_installment_rates ?? jsonOther?.installment_rates;

  const pix =
    rawPix !== undefined && rawPix !== null && rawPix !== "" && Number(rawPix) > 0
      ? Number(rawPix)
      : undefined;

  const debit =
    rawDebit !== undefined && rawDebit !== null && rawDebit !== "" && Number(rawDebit) > 0
      ? Number(rawDebit)
      : undefined;

  const credit_vista =
    rawVista !== undefined && rawVista !== null && rawVista !== "" && Number(rawVista) > 0
      ? Number(rawVista)
      : undefined;

  const credit_installment =
    rawInstRate !== undefined && rawInstRate !== null && rawInstRate !== "" && Number(rawInstRate) > 0
      ? Number(rawInstRate)
      : undefined;

  let installment_rates: Record<string, number> | undefined;
  if (rawInsts && typeof rawInsts === "object" && !Array.isArray(rawInsts)) {
    const parsed: Record<string, number> = {};
    let count = 0;
    for (const [k, v] of Object.entries(rawInsts)) {
      const num = Number(v);
      if (!isNaN(num) && num > 0) {
        parsed[k] = num;
        count++;
      }
    }
    if (count > 0) {
      installment_rates = parsed;
    }
  }

  // Se nenhum campo da Tabela 2 estiver preenchido com valor positivo, considera vazia ou inexistente
  if (
    pix === undefined &&
    debit === undefined &&
    credit_vista === undefined &&
    credit_installment === undefined &&
    !installment_rates
  ) {
    return null;
  }

  return {
    pix_rate: pix,
    debit_rate: debit,
    credit_vista_rate: credit_vista,
    credit_installment_rate: credit_installment,
    installment_rates,
  };
}

export function getModalityRate(t: Transaction, plan?: FeePlan, rateTableKey?: string): number {
  const effectiveKey = resolveTransactionRateTable(t, rateTableKey);
  const table = getReferenceTable(effectiveKey);
  if (t.modality === 'cash') return plan ? plan.cash_rate : 0;

  const installments = t.installments || 1;
  const isVM = isVisaOrMaster(t.brand);
  const otherRates = !isVM ? getOtherBrandRates(plan) : null;

  // PIX
  if (t.modality === 'pix') {
    // 1. Se bandeira diferente de Visa/Master e Tabela 2 tiver taxa Pix configurada
    if (!isVM && otherRates?.pix_rate !== undefined && otherRates.pix_rate > 0) {
      return otherRates.pix_rate;
    }
    // 2. Se for Visa/Master, OU se for outra bandeira com Tabela 2 vazia/inexistente (fallback retrocompatível)
    if (plan && plan.pix_rate > 0) return plan.pix_rate;
    // 3. Fallback tabela referencial CPAG
    return table.pix;
  }

  // DÉBITO
  if (t.modality === 'debit') {
    // 1. Se bandeira diferente de Visa/Master e Tabela 2 preenchida, aplica Tabela 2
    if (!isVM && otherRates?.debit_rate !== undefined && otherRates.debit_rate > 0) {
      return otherRates.debit_rate;
    }
    // 2. Se for Visa/Master, OU se for outra bandeira com Tabela 2 vazia/inexistente (fallback retrocompatível)
    if (plan && plan.debit_rate > 0) return plan.debit_rate;
  }

  // CRÉDITO À VISTA
  if (t.modality === 'credit_vista') {
    // 1. Se bandeira diferente de Visa/Master e Tabela 2 preenchida
    if (!isVM && otherRates) {
      if (otherRates.credit_vista_rate !== undefined && otherRates.credit_vista_rate > 0) {
        return otherRates.credit_vista_rate;
      }
      if (otherRates.installment_rates) {
        const v1 = otherRates.installment_rates["1"] ?? otherRates.installment_rates[1];
        if (v1 !== undefined && v1 !== null && Number(v1) > 0) return Number(v1);
      }
    }
    // 2. Se for Visa/Master, OU se for outra bandeira com Tabela 2 vazia/inexistente (fallback retrocompatível)
    if (plan && plan.credit_vista_rate > 0) return plan.credit_vista_rate;
    if (plan && (plan as any).installment_rates) {
      const instRates = (plan as any).installment_rates;
      const v1 = instRates["1"] ?? instRates[1];
      if (v1 !== undefined && v1 !== null && Number(v1) > 0) return Number(v1);
    }
  }

  // CRÉDITO PARCELADO
  if (t.modality === 'credit_installment') {
    // 1. Se bandeira diferente de Visa/Master e Tabela 2 preenchida
    if (!isVM && otherRates) {
      if (otherRates.installment_rates) {
        const val = otherRates.installment_rates[String(installments)] ?? otherRates.installment_rates[installments];
        if (val !== undefined && val !== null && Number(val) > 0) {
          return Number(val);
        }
      }
      if (otherRates.credit_installment_rate !== undefined && otherRates.credit_installment_rate > 0) {
        return otherRates.credit_installment_rate;
      }
    }
    // 2. Se for Visa/Master, OU se for outra bandeira com Tabela 2 vazia/inexistente (fallback retrocompatível)
    if (plan && (plan as any).installment_rates) {
      const instRates = (plan as any).installment_rates;
      if (instRates && typeof instRates === "object") {
        const val = instRates[String(installments)] ?? instRates[installments];
        if (val !== undefined && val !== null && Number(val) > 0) {
          return Number(val);
        }
      }
    }
    if (plan && plan.credit_installment_rate > 0) return plan.credit_installment_rate;
  }

  // 3. Fallback final: Tabela padrão contratual de referência (CPAG59 ou CPAG56)
  // identificando exatamente a bandeira da transação (elo, hiper, amex, cabal, vm)
  const brand = (t.brand || "").toLowerCase();
  let bKey: keyof typeof CPAG59 = 'vm';
  if (brand.includes('elo')) bKey = 'elo';
  else if (brand.includes('hiper')) bKey = 'hiper';
  else if (brand.includes('amex')) bKey = 'amex';
  else if (brand.includes('cabal')) bKey = 'cabal';
  
  const bData = table[bKey] as any;
  if (!bData) return 0;
  
  if (t.modality === 'debit') return bData.debit;
  
  if (installments >= 1 && installments <= 21) {
    return bData.credit[installments];
  }
  return 0;
}

export function getCPAG59Rate(t: Transaction, rateTableKey?: string): number {
  return getModalityRate(t, undefined, rateTableKey);
}

export function getContractualRate(t: Transaction, rateTableKey?: string): number {
  return getModalityRate(t, undefined, rateTableKey);
}

export function getMaxDiscountRate(t: Transaction, plan?: FeePlan): number {
  const opRatePlan = Number(plan?.fixed_rate_percent || 0);
  const modalityBaseRate = getModalityRate(t, plan);
  return opRatePlan + modalityBaseRate;
}

export function calculateClosure(
  transactions: Transaction[],
  expenses: Expense[],
  plan: FeePlan | undefined,
  terminals: PosTerminal[] = [],
): ClosureCalc {
  const grossByModality = {} as Record<Modality, number>;
  const feeByModality = {} as Record<Modality, number>;
  for (const m of MODALITIES) {
    grossByModality[m.value] = 0;
    feeByModality[m.value] = 0;
  }

  let totalGross = 0;
  let modalityFeeTotal = 0;
  let traditionalCost = 0;
  let sumTransactionOpFee = 0;

  for (const t of transactions) {
    const mod = t.modality as Modality;
    const gross = Number(t.gross_amount);
    grossByModality[mod] += gross;
    totalGross += gross;

    const rate = getModalityRate(t, plan);
    const fee = (gross * rate) / 100;
    feeByModality[mod] += fee;
    modalityFeeTotal += fee;

    let discountedValue = 0;
    let tradRate = 0;
    if (t.net_amount !== null && t.net_amount !== undefined) {
      discountedValue = gross - Number(t.net_amount);
      tradRate = gross > 0 ? (discountedValue / gross) * 100 : 0;
    } else {
      tradRate = getTraditionalRate(t, plan);
      discountedValue = gross * (tradRate / 100);
    }
    traditionalCost += discountedValue;

    // Valor máximo que pode ser descontado do EC (Taxa Operacional do Plano + Taxa por Modalidade Manual ou CPAG59)
    const maxDiscountRate = getMaxDiscountRate(t, plan);
    // % TAXA OP = Valor máximo que pode ser descontado - % DESCONTADO na máquina
    const opRate = Math.max(0, maxDiscountRate - tradRate);
    const opValue = gross * (opRate / 100);
    sumTransactionOpFee += opValue;
  }

  const { primaRate, traditionalRate } = getTierRates(totalGross);
  const customPrimaRate = plan ? plan.fixed_rate_percent : primaRate;
  const fixedFeeAmount = (totalGross * customPrimaRate) / 100;
  
  // O valor a ser cobrado na plataforma é a soma da taxa operacional das transações
  const totalOpFee = (transactions.length > 0 && sumTransactionOpFee > 0) ? sumTransactionOpFee : fixedFeeAmount;
  
  // Apuração de Maquininhas e Isenções por Faturamento
  const terminalSummary = calculateTerminalBilling(terminals, totalGross);

  // Se houver terminais cadastrados no EC, removemos lançamentos manuais com nome "maquina" para não cobrar em dobro
  const filteredExpenses = terminals.length > 0
    ? expenses.filter((e) => {
        const desc = (e.description || "").toLowerCase().trim();
        return !desc.match(/^maquina\s*(\(\d+\/\d+\))?$/i) && !desc.match(/^maquininha/i);
      })
    : expenses;

  // Lançamentos incluem cobranças das máquinas não isentas (R$ 100 cada)
  let totalExpenses = terminalSummary.totalCharge;
  let totalCharges = 0;
  for (const e of filteredExpenses) {
    if (e.category === "cobranca") {
      totalCharges += Number(e.amount);
    } else {
      totalExpenses += Number(e.amount);
    }
  }
  
  const netInvoice = totalOpFee + totalExpenses - totalCharges;
  
  // Custo Tradicional = Taxas de transação + markup de mercado + custo de todas as máquinas (R$ 100 cada)
  traditionalCost += (totalGross * traditionalRate) / 100;
  traditionalCost += terminalSummary.totalTerminals * TERMINAL_PRICE;
  
  // Custo Solução Prima = Taxas por modalidade + Taxa operacional + Cobrança das máquinas não isentas
  const totalMerchantCost = modalityFeeTotal + totalOpFee + terminalSummary.totalCharge;
  // Economia apurada = custo tradicional - custo com a solução Prima
  const savings = traditionalCost - totalMerchantCost;
  
  const effectiveTraditionalRate = totalGross > 0 ? (traditionalCost / totalGross) * 100 : 0;

  return {
    grossByModality,
    feeByModality,
    totalGross,
    modalityFeeTotal,
    fixedFeeAmount,
    totalOpFee,
    totalExpenses,
    totalCharges,
    netInvoice,
    traditionalCost,
    savings,
    totalMerchantCost,
    appliedPrimaRate: customPrimaRate,
    appliedTraditionalRate: effectiveTraditionalRate,
    terminalSummary,
  };
}
