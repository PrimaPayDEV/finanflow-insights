import { createServerFn } from "@tanstack/react-start";

export const getPublicReportData = createServerFn({ method: "GET" })
  .validator((d: string) => d)
  .handler(async ({ data: closureId }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: closure, error: cErr } = await supabaseAdmin
      .from("closures")
      .select("*, merchants(*)")
      .eq("id", closureId)
      .maybeSingle();

    if (cErr || !closure || !closure.merchants) {
      throw new Error("Relatório não encontrado ou indisponível.");
    }

    const merchantId = closure.merchant_id;
    const refMonth = closure.reference_month;

    const { data: plan } = await supabaseAdmin
      .from("fee_plans")
      .select("*")
      .eq("merchant_id", merchantId)
      .maybeSingle();

    const { data: transactions } = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("merchant_id", merchantId);

    const { data: expenses } = await supabaseAdmin
      .from("expenses_adjustments")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("reference_month", refMonth);

    const { data: imports } = await supabaseAdmin
      .from("statements_imports")
      .select("id, reference_month");

    const importsMap = new Map<string, string>();
    (imports || []).forEach(i => importsMap.set(i.id, i.reference_month));

    const txs = (transactions || []).filter((t) => {
      const txMonth = t.import_id ? importsMap.get(t.import_id) : t.transaction_date.slice(0, 7);
      return txMonth === refMonth;
    });

    return {
      closure,
      merchant: closure.merchants as any,
      plan: plan || null,
      txs,
      exps: expenses || [],
    };
  });
