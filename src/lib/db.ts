import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Merchant = Tables<"merchants">;
export type PosTerminal = Tables<"pos_terminals">;
export type FeePlan = Tables<"fee_plans">;
export type Transaction = Tables<"transactions">;
export type Expense = Tables<"expenses_adjustments">;
export type Closure = Tables<"closures">;
export type SplitRule = Tables<"split_rules">;
export type StatementImport = Tables<"statements_imports">;
export type Notification = Tables<"notifications">;

function unwrap<T>({ data, error }: { data: T | null; error: { message: string } | null }): T {
  if (error) throw new Error(error.message);
  return data as T;
}

export const merchantsQuery = {
  queryKey: ["merchants"],
  queryFn: async () =>
    unwrap(await supabase.from("merchants").select("*").order("name")) as Merchant[],
};

export const terminalsQuery = {
  queryKey: ["pos_terminals"],
  queryFn: async () =>
    unwrap(await supabase.from("pos_terminals").select("*").order("created_at")) as PosTerminal[],
};

export const feePlansQuery = {
  queryKey: ["fee_plans"],
  queryFn: async () => unwrap(await supabase.from("fee_plans").select("*")) as FeePlan[],
};

export const splitRulesQuery = {
  queryKey: ["split_rules"],
  queryFn: async () => unwrap(await supabase.from("split_rules").select("*")) as SplitRule[],
};

export const transactionsQuery = {
  queryKey: ["transactions"],
  queryFn: async () =>
    unwrap(
      await supabase.from("transactions").select("*").order("transaction_date", { ascending: false }),
    ) as Transaction[],
};

export const expensesQuery = {
  queryKey: ["expenses"],
  queryFn: async () =>
    unwrap(
      await supabase.from("expenses_adjustments").select("*").order("created_at", { ascending: false }),
    ) as Expense[],
};

export const closuresQuery = {
  queryKey: ["closures"],
  queryFn: async () =>
    unwrap(
      await supabase.from("closures").select("*").order("created_at", { ascending: false }),
    ) as Closure[],
};

export const importsQuery = {
  queryKey: ["imports"],
  queryFn: async () =>
    unwrap(
      await supabase.from("statements_imports").select("*").order("created_at", { ascending: false }),
    ) as StatementImport[],
};

export const notificationsQuery = {
  queryKey: ["notifications"],
  queryFn: async () =>
    unwrap(
      await supabase.from("notifications").select("*").order("created_at", { ascending: false }),
    ) as Notification[],
};

export { unwrap };
