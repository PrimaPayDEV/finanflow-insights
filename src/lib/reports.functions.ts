import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getBillingReports = createServerFn({ method: "POST" })
  .validator(z.object({ 
    companyId: z.string().uuid(),
    period: z.enum(["month", "last_month", "last_3_months", "custom"]),
    customRange: z.object({ from: z.string().optional(), to: z.string().optional() }).optional()
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get company and settings for Asaas API
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("asaas_api_key")
      .eq("id", data.companyId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from("asaas_settings")
      .select("*")
      .eq("company_id", data.companyId)
      .limit(1)
      .maybeSingle();

    const sandbox = settings?.sandbox ?? false;
    const apiKey = company?.asaas_api_key || (sandbox ? process.env.ASAAS_API_TESTE : process.env.ASAAS_API_KEY);

    if (!apiKey) {
      return { ok: false as const, error: `Chave da API do Asaas não configurada.` };
    }

    const base = sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3";

    // 1. Fetch payments
    const payRes = await fetch(`${base}/payments?limit=100`, {
      headers: { access_token: apiKey },
    });
    const paymentsData = await payRes.json();
    const payments = paymentsData.data || [];

    // 2. Fetch all members and partners for this company
    const { data: members } = await supabaseAdmin
      .from("members")
      .select("asaas_customer_id, name, partner_id, partners(id, name, split_percent)")
      .eq("company_id", data.companyId);

    // Build reports
    const invoiceReports = [];
    const partnerReportsMap = new Map();

    for (const p of payments) {
      // Find member
      const member = members?.find(m => m.asaas_customer_id === p.customer);
      const partner = member?.partners as any;

      // Invoice report
      invoiceReports.push({
        id: p.id,
        customerName: member?.name || "Desconhecido",
        description: p.description,
        dueDate: p.dueDate,
        value: p.value,
        status: p.status,
        partnerName: partner?.name || "-"
      });

      // Partner report (only if paid)
      if (partner && (p.status === "RECEIVED" || p.status === "CONFIRMED" || p.status === "RECEIVED_IN_CASH")) {
        const splitAmount = (p.value * (Number(partner.split_percent) / 100));
        
        if (!partnerReportsMap.has(partner.id)) {
          partnerReportsMap.set(partner.id, {
            partnerId: partner.id,
            partnerName: partner.name,
            totalValue: 0,
            invoicesCount: 0
          });
        }
        const pr = partnerReportsMap.get(partner.id);
        pr.totalValue += splitAmount;
        pr.invoicesCount += 1;
      }
    }

    const partnerReports = Array.from(partnerReportsMap.values());

    return {
      ok: true as const,
      invoices: invoiceReports,
      partners: partnerReports
    };
  });
