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
  netInvoice: number;
  traditionalCost: number;
  savings: number;
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

  for (const t of transactions) {
    const mod = t.modality as Modality;
    grossByModality[mod] = (grossByModality[mod] ?? 0) + Number(t.gross_amount);
  }

  let modalityFeeTotal = 0;
  let totalGross = 0;
  for (const m of MODALITIES) {
    const gross = grossByModality[m.value];
    const rate = plan ? Number((plan as unknown as Record<string, number>)[rateFieldByModality[m.value]] ?? 0) : 0;
    const fee = (gross * rate) / 100;
    feeByModality[m.value] = fee;
    modalityFeeTotal += fee;
    totalGross += gross;
  }

  const { traditionalRate, primaRate } = getTierRates(totalGross);
  const customPrimaRate = plan?.fixed_rate_percent && plan.fixed_rate_percent > 0 ? plan.fixed_rate_percent : primaRate;
  const fixedFeeAmount = (totalGross * customPrimaRate) / 100;
  const totalOpFee = modalityFeeTotal + fixedFeeAmount;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netInvoice = totalOpFee - totalExpenses;
  const traditionalCost = (totalGross * traditionalRate) / 100;
  const savings = traditionalCost - totalOpFee;

  return {
    grossByModality,
    feeByModality,
    totalGross,
    modalityFeeTotal,
    fixedFeeAmount,
    totalOpFee,
    totalExpenses,
    netInvoice,
    traditionalCost,
    savings,
    appliedPrimaRate: customPrimaRate,
    appliedTraditionalRate: traditionalRate,
  };
}
