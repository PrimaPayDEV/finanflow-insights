import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  companyId: z.string().uuid(),
  closureId: z.string().uuid(),
  customer: z.object({
    name: z.string().min(1).max(200),
    cpfCnpj: z.string().min(11).max(20),
    email: z
      .string()
      .max(200)
      .nullish()
      .transform((v) => {
        const t = (v ?? "").trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : undefined;
      }),
    phone: z
      .string()
      .max(30)
      .nullish()
      .transform((v) => (v ?? "").trim() || undefined),
  }),
  value: z.number().positive(),
  description: z.string().max(500),
  splits: z
    .array(z.object({ walletId: z.string().min(1), percentualValue: z.number().positive().max(100) }))
    .max(20)
    .default([]),
});

const subaccountSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  cpfCnpj: z.string().min(11, "Documento inválido"),
  companyType: z.string().min(1, "Tipo de empresa é obrigatório"),
  mobilePhone: z.string().min(10, "Celular inválido"),
  incomeValue: z.number().positive("O faturamento deve ser maior que zero"),
  address: z.string().min(1, "Endereço é obrigatório"),
  addressNumber: z.string().min(1, "Número é obrigatório"),
  province: z.string().min(1, "Bairro é obrigatório"),
  postalCode: z.string().min(8, "CEP inválido"),
});

export const checkAsaasConfigured = createServerFn({ method: "GET" })
  .validator((d: { companyId: string }) => d)
  .handler(async ({ data: { companyId } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("name, asaas_api_key, asaas_webhook_token")
      .eq("id", companyId)
      .single();
    
    const isPrimaPay = company?.name === "Prima Hub" || company?.name === "PrimaPay";
    const key = company?.asaas_api_key || (isPrimaPay ? (process.env.ASAAS_API_KEY || process.env.ASAAS_API_TESTE) : null);
    return {
      configured: Boolean(key),
      webhookTokenConfigured: Boolean(company?.asaas_webhook_token || (isPrimaPay ? process.env.ASAAS_WEBHOOK_TOKEN : null)),
    };
  });

import { getNextBusinessDueDate, formatNextBusinessDueDate } from "./dateUtils";

function nextDueDate(dueDay: number) {
  return formatNextBusinessDueDate(new Date(), dueDay);
}

function getExactDueDate(dueDay: number) {
  const day = Math.min(Math.max(dueDay, 1), 31);
  const now = new Date();
  let targetYear = now.getFullYear();
  let targetMonth = now.getMonth();
  if (now.getDate() > day) {
    targetMonth += 1;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear += 1;
    }
  }
  const dateObj = new Date(targetYear, targetMonth, day);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
}

export const createAsaasCharge = createServerFn({ method: "POST" })
  .validator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    // 1. Fetch Company for API Key
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("asaas_api_key, name, app_mode, segment")
      .eq("id", data.companyId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from("asaas_settings")
      .select("*")
      .eq("company_id", data.companyId)
      .limit(1)
      .maybeSingle();

    const sandbox = settings?.sandbox ?? false;
    const isPrimaPay = company?.name === "Prima Hub" || company?.name === "PrimaPay";
    const isPlanmais = company?.app_mode === "billing" || company?.segment === "veicular" || (company?.name || "").toLowerCase().includes("planmais");
    // Use company key, fallback to env ONLY for platform
    const apiKey = company?.asaas_api_key || (isPrimaPay ? (sandbox ? process.env.ASAAS_API_TESTE : process.env.ASAAS_API_KEY) : null);

    if (!apiKey) {
      return { ok: false as const, error: `Chave da API do Asaas não configurada para a sua empresa.` };
    }


    const base = sandbox
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/v3";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "PrimaHub",
      access_token: apiKey,
    };


    // 1. Cliente (busca por CPF/CNPJ, cria se não existir)
    const found = await fetch(`${base}/customers?cpfCnpj=${encodeURIComponent(data.customer.cpfCnpj)}`, {
      headers,
    });
    const foundJson = (await found.json()) as { data?: Array<{ id: string }> };
    let customerId = foundJson.data?.[0]?.id;

    if (!customerId) {
      const created = await fetch(`${base}/customers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: data.customer.name,
          cpfCnpj: data.customer.cpfCnpj,
          email: data.customer.email || undefined,
          mobilePhone: data.customer.phone || undefined,
        }),
      });
      const createdJson = (await created.json()) as {
        id?: string;
        errors?: Array<{ description: string }>;
      };
      if (!createdJson.id) {
        return {
          ok: false as const,
          error: createdJson.errors?.[0]?.description ?? "Falha ao criar cliente no Asaas.",
        };
      }
      customerId = createdJson.id;
    }

    // 2. Cobrança híbrida Boleto/Pix com split
    const discountPercent = Number(settings?.discount_percent ?? 0);
    const rawDescription = settings?.default_description
      ? `${settings.default_description} — ${data.description}`
      : data.description;
    const finalDescription = isPlanmais
      ? `${rawDescription} — NÃO RECEBER APÓS O VENCIMENTO`.slice(0, 500)
      : rawDescription;

    const paymentRes = await fetch(`${base}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: Number(data.value.toFixed(2)),
        dueDate: isPlanmais ? getExactDueDate(Number(settings?.due_day ?? 20)) : nextDueDate(Number(settings?.due_day ?? 10)),
        description: finalDescription,
        ...(isPlanmais
          ? {
              daysAfterDueDateToRegistrationCancellation: 0,
              fine: { value: 0, type: "PERCENTAGE" },
              interest: { value: 0 },
            }
          : {
              fine: { value: Number(settings?.fine_percent ?? 0), type: "PERCENTAGE" },
              interest: { value: Number(settings?.interest_percent ?? 0) },
            }),
        ...(discountPercent > 0
          ? {
              discount: {
                value: discountPercent,
                dueDateLimitDays: Number(settings?.discount_deadline_days ?? 0),
                type: "PERCENTAGE",
              },
            }
          : {}),
        ...(data.splits.length > 0
          ? {
              split: data.splits.map((s) => ({
                walletId: s.walletId.trim(),
                percentualValue: Number(s.percentualValue),
              })),
            }
          : {}),
      }),
    });
    const payment = (await paymentRes.json()) as {
      id?: string;
      invoiceUrl?: string;
      bankSlipUrl?: string;
      errors?: Array<{ description: string }>;
    };
    if (!payment.id) {
      return {
        ok: false as const,
        error: payment.errors?.[0]?.description ?? "Falha ao criar cobrança no Asaas.",
      };
    }

    const closureUpdate = await supabaseAdmin
      .from("closures")
      .update({
        status: "invoice_generated",
        asaas_payment_id: payment.id,
        asaas_invoice_url: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
      })
      .eq("id", data.closureId)
      .select("merchants(name)")
      .single();

    if (closureUpdate.data?.merchants?.name) {
      await supabaseAdmin.from("notifications").insert({
        company_id: data.companyId,
        type: "closure",
        title: "Boleto Gerado",
        description: `Boleto gerado para o estabelecimento ${closureUpdate.data.merchants.name} no valor de R$ ${data.value.toFixed(2)}.`
      });
    }

    return {
      ok: true as const,
      paymentId: payment.id,
      invoiceUrl: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
    };
  });

export const createAsaasSubaccount = createServerFn({ method: "POST" })
  .validator((d: unknown) => subaccountSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch Company for API Key
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("asaas_api_key, name")
      .eq("id", data.companyId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from("asaas_settings")
      .select("*")
      .eq("company_id", data.companyId)
      .limit(1)
      .maybeSingle();

    const sandbox = settings?.sandbox ?? false;
    const isPrimaPay = company?.name === "Prima Hub" || company?.name === "PrimaPay";
    const apiKey = company?.asaas_api_key || (isPrimaPay ? (sandbox ? process.env.ASAAS_API_TESTE : process.env.ASAAS_API_KEY) : null);

    if (!apiKey) {
      return { ok: false as const, error: `Chave da API do Asaas não configurada para a sua empresa.` };
    }


    const base = sandbox
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/v3";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "PrimaHub",
      access_token: apiKey,
    };

    const res = await fetch(`${base}/accounts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        loginEmail: data.email,
        cpfCnpj: data.cpfCnpj.replace(/\D/g, ''),
        companyType: data.companyType,
        mobilePhone: data.mobilePhone.replace(/\D/g, ''),
        incomeValue: data.incomeValue,
        address: data.address,
        addressNumber: data.addressNumber,
        province: data.province,
        postalCode: data.postalCode.replace(/\D/g, ''),
      }),
    });

    const parsed = (await res.json()) as {
      walletId?: string;
      apiKey?: string;
      errors?: Array<{ description: string }>;
    };

    if (!parsed.walletId) {
      return {
        ok: false as const,
        error: parsed.errors?.[0]?.description ?? "Falha ao criar subconta no Asaas.",
      };
    }

    return {
      ok: true as const,
      walletId: parsed.walletId,
      apiKey: parsed.apiKey,
    };
  });

export const getAsaasDashboardMetrics = createServerFn({ method: "POST" })
  .validator((d: { companyId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("asaas_api_key, name")
      .eq("id", data.companyId)
      .single();

    const { data: settings } = await supabaseAdmin
      .from("asaas_settings")
      .select("*")
      .eq("company_id", data.companyId)
      .limit(1)
      .maybeSingle();

    const sandbox = settings?.sandbox ?? false;
    const isPrimaPay = company?.name === "Prima Hub" || company?.name === "PrimaPay";
    const apiKey = company?.asaas_api_key || (isPrimaPay ? (sandbox ? process.env.ASAAS_API_TESTE : process.env.ASAAS_API_KEY) : null);

    if (!apiKey) {
      return { ok: false as const, error: `Chave da API não configurada.` };
    }

    const base = sandbox
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/v3";

    try {
      const balRes = await fetch(`${base}/finance/balance`, {
        headers: { access_token: apiKey, "User-Agent": "PrimaHub" },
      });
      const balanceData = await balRes.json();

      const payRes = await fetch(`${base}/payments?limit=100`, {
        headers: { access_token: apiKey, "User-Agent": "PrimaHub" },
      });
      const paymentsData = await payRes.json();

      let totalPending = 0;
      let totalOverdue = 0;
      let totalReceived = 0;
      let countAssociados = 0;

      const uniqueCustomers = new Set<string>();
      if (paymentsData && paymentsData.data) {
        for (const p of paymentsData.data) {
          uniqueCustomers.add(p.customer);
          if (p.status === "PENDING") totalPending += p.value;
          else if (p.status === "OVERDUE") totalOverdue += p.value;
          else if (p.status === "RECEIVED" || p.status === "CONFIRMED" || p.status === "RECEIVED_IN_CASH") totalReceived += p.value;
        }
        countAssociados = uniqueCustomers.size;
      }

      let recentPayments = paymentsData.data || [];

      if (recentPayments.length > 0) {
        const customerIds = [...uniqueCustomers] as string[];
        const [{ data: members }, { data: partners }] = await Promise.all([
          supabaseAdmin
            .from("members")
            .select("id, asaas_customer_id, name, phone, document, partner_id, partners(id, name, split_percent, asaas_wallet_id)")
            .in("asaas_customer_id", customerIds),
          supabaseAdmin
            .from("partners")
            .select("id, name, split_percent, asaas_wallet_id, phone, email")
            .eq("company_id", data.companyId),
        ]);

        const memberMap = new Map((members || []).map((m: any) => [m.asaas_customer_id, m]));
        const partnersMap = new Map((partners || []).map((pt: any) => [pt.id, pt]));

        recentPayments = recentPayments.map((p: any) => {
          const m = memberMap.get(p.customer);
          let rawPt = Array.isArray(m?.partners) ? m.partners[0] : m?.partners;
          if (!rawPt && m?.partner_id) {
            rawPt = partnersMap.get(m.partner_id);
          }

          const asaasSplit = Array.isArray(p.split) && p.split.length > 0 ? p.split[0] : null;

          if (!rawPt && asaasSplit?.walletId) {
            rawPt = (partners || []).find((x: any) => x.asaas_wallet_id === asaasSplit.walletId);
          }

          let splitPercent = 0;
          if (asaasSplit?.percentualValue) {
            splitPercent = Number(asaasSplit.percentualValue);
          } else if (rawPt?.split_percent) {
            splitPercent = Number(rawPt.split_percent);
          }

          const splitFixed = asaasSplit?.fixedValue ? Number(asaasSplit.fixedValue) : 0;
          const splitAmount = splitFixed > 0 ? splitFixed : (splitPercent > 0 ? Number((p.value * (splitPercent / 100)).toFixed(2)) : 0);
          const partnerName = rawPt?.name || (asaasSplit ? `Carteira ${asaasSplit.walletId.slice(0, 8)}...` : null);
          const hasSplit = splitAmount > 0 || !!asaasSplit || (!!rawPt && splitPercent > 0);

          return {
            ...p,
            customerName: m?.name || p.customerName || p.customer,
            customerPhone: m?.phone,
            customerDocument: m?.document,
            partnerId: rawPt?.id || null,
            partnerName,
            splitPercent,
            splitAmount,
            hasSplit,
            asaasSplit,
          };
        });
      }

      return {
        ok: true as const,
        data: {
          balance: balanceData.balance || 0,
          totalPending,
          totalOverdue,
          totalReceived,
          countAssociados,
          recentPayments
        }
      };
    } catch (error: any) {
      return { ok: false as const, error: error.message };
    }
  });
