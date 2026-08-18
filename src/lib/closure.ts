import type { Expense, FeePlan, Transaction } from "@/lib/db";
import { MODALITIES, rateFieldByModality, type Modality } from "@/lib/format";

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
  if (plan && plan.traditional_fee_avg > 0) return plan.traditional_fee_avg;

  if (t.modality === 'pix') return TRADITIONAL_RATES.pix;
  if (t.modality === 'cash') return 0;
  
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

const CPAG59 = {
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

export function getModalityRate(t: Transaction, plan?: FeePlan): number {
  if (t.modality === 'pix') return (plan && plan.pix_rate > 0) ? plan.pix_rate : CPAG59.pix;
  if (t.modality === 'cash') return (plan && plan.cash_rate > 0) ? plan.cash_rate : 0;

  const installments = t.installments || 1;

  if (t.modality === 'debit' && plan && plan.debit_rate > 0) return plan.debit_rate;
  if (t.modality === 'credit' && installments === 1 && plan && plan.credit_vista_rate > 0) return plan.credit_vista_rate;
  if (t.modality === 'credit' && installments > 1 && plan && plan.credit_installment_rate > 0) return plan.credit_installment_rate;

  const brand = (t.brand || "").toLowerCase();
  let bKey: keyof typeof CPAG59 = 'vm';
  if (brand.includes('elo')) bKey = 'elo';
  else if (brand.includes('hiper')) bKey = 'hiper';
  else if (brand.includes('amex')) bKey = 'amex';
  else if (brand.includes('cabal')) bKey = 'cabal';
  
  const bData = CPAG59[bKey] as any;
  if (!bData) return 0;
  
  if (t.modality === 'debit') return bData.debit;
  
  if (installments >= 1 && installments <= 21) {
    return bData.credit[installments];
  }
  return 0;
}

export function calculateClosure(
  transactions: Transaction[],
  expenses: Expense[],
  plan: FeePlan | undefined,
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

  for (const t of transactions) {
    const mod = t.modality as Modality;
    const gross = Number(t.gross_amount);
    grossByModality[mod] += gross;
    totalGross += gross;

    const rate = getModalityRate(t, plan);
    const fee = (gross * rate) / 100;
    feeByModality[mod] += fee;
    modalityFeeTotal += fee;

    const tradRate = getTraditionalRate(t, plan);
    traditionalCost += (gross * tradRate) / 100;
  }

  const { primaRate, traditionalRate } = getTierRates(totalGross);
  const customPrimaRate = plan?.fixed_rate_percent && plan.fixed_rate_percent > 0 ? plan.fixed_rate_percent : primaRate;
  const fixedFeeAmount = (totalGross * customPrimaRate) / 100;
  
  // O valor a ser cobrado na plataforma é a taxa operacional vezes o faturamento
  const totalOpFee = fixedFeeAmount;
  
  let totalExpenses = 0;
  let totalCharges = 0;
  for (const e of expenses) {
    if (e.category === "cobranca") {
      totalCharges += Number(e.amount);
    } else {
      totalExpenses += Number(e.amount);
    }
  }
  
  const netInvoice = totalOpFee + totalExpenses - totalCharges;
  
  // Traditional Cost = (Transaction Fees from Image) + (Total Gross * Traditional Operational Rate from Image)
  traditionalCost += (totalGross * traditionalRate) / 100;
  
  // Savings is traditional cost minus the merchant's total cost (transaction fees + operational fee)
  const totalMerchantCost = modalityFeeTotal + totalOpFee;
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
  };
}
