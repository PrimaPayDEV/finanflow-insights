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
};

export function inMonth(dateIso: string, month: string) {
  return dateIso.slice(0, 7) === month;
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

  const fixedFeeAmount = (totalGross * Number(plan?.fixed_rate_percent ?? 0)) / 100;
  const totalOpFee = modalityFeeTotal + fixedFeeAmount;
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const netInvoice = totalOpFee - totalExpenses;
  const traditionalCost = (totalGross * Number(plan?.traditional_fee_avg ?? 0)) / 100;
  const savings = traditionalCost - netInvoice;

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
  };
}
