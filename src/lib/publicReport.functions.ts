import { createServerFn } from "@tanstack/react-start";

// Same month rule used by the closures screen (and its PDF): a sale belongs to the
// month of its import OR to the month of its sale date.
function isTxInMonth(t: any, targetMonth: string, importsMap: Map<string, string>) {
  if (t.import_id) {
    const refMonth = importsMap.get(t.import_id);
    if (refMonth && refMonth === targetMonth) return true;
  }
  if (t.transaction_date) {
    const dateStr = String(t.transaction_date).trim();
    if (dateStr.slice(0, 7) === targetMonth) return true;
    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ")[0].split("/");
      if (parts.length === 3) {
        const ym =
          parts[2].length === 4
            ? `${parts[2]}-${parts[1].padStart(2, "0")}`
            : `${parts[0]}-${parts[1].padStart(2, "0")}`;
        if (ym === targetMonth) return true;
      }
    }
  }
  return false;
}

export const getPublicReportData = createServerFn({ method: "GET" })
  .validator((d: string) => {
    if (typeof d !== "string" || !/^[0-9a-f-]{36}$/i.test(d)) {
      throw new Error("Relatório inválido.");
    }
    return d;
  })
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

    // Paginate: a merchant can have more than 1000 sales in total.
    const PAGE_SIZE = 1000;
    const transactions: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data: chunk, error } = await supabaseAdmin
        .from("transactions")
        .select("*")
        .eq("merchant_id", merchantId)
        .order("transaction_date", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error("Não foi possível carregar as vendas do relatório.");
      if (!chunk || chunk.length === 0) break;
      transactions.push(...chunk);
      if (chunk.length < PAGE_SIZE) break;
    }

    const { data: expenses } = await supabaseAdmin
      .from("expenses_adjustments")
      .select("*")
      .eq("merchant_id", merchantId)
      .eq("reference_month", refMonth);

    const { data: terminals } = await supabaseAdmin
      .from("pos_terminals")
      .select("*")
      .eq("merchant_id", merchantId);

    const importIds = Array.from(
      new Set(transactions.map((t) => t.import_id).filter(Boolean) as string[]),
    );
    const importsMap = new Map<string, string>();
    if (importIds.length > 0) {
      const { data: imports } = await supabaseAdmin
        .from("statements_imports")
        .select("id, reference_month")
        .in("id", importIds);
      (imports || []).forEach((i) => importsMap.set(i.id, i.reference_month));
    }

    const txs = transactions.filter((t) => isTxInMonth(t, refMonth, importsMap));

    return {
      closure,
      merchant: closure.merchants as any,
      plan: plan || null,
      txs,
      exps: expenses || [],
      terminals: terminals || [],
    };
  });
