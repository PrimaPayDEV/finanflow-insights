import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  closureId: z.string().uuid(),
  customer: z.object({
    name: z.string().min(1).max(200),
    cpfCnpj: z.string().min(11).max(20),
    email: z.string().email().max(200).optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
  }),
  value: z.number().positive(),
  description: z.string().max(500),
  splits: z
    .array(z.object({ walletId: z.string().min(1), percentualValue: z.number().positive().max(100) }))
    .max(20)
    .default([]),
});

export const checkAsaasConfigured = createServerFn({ method: "GET" }).handler(async () => ({
  configured: Boolean(process.env.ASAAS_API_KEY),
  webhookTokenConfigured: Boolean(process.env.ASAAS_WEBHOOK_TOKEN),
}));

function nextDueDate(dueDay: number) {
  const now = new Date();
  const day = Math.min(Math.max(dueDay, 1), 28);
  let due = new Date(now.getFullYear(), now.getMonth(), day);
  if (due.getTime() - now.getTime() < 2 * 24 * 60 * 60 * 1000) {
    due = new Date(now.getFullYear(), now.getMonth() + 1, day);
  }
  return due.toISOString().slice(0, 10);
}

export const createAsaasCharge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "ASAAS_API_KEY não configurada no backend." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: settings } = await supabaseAdmin
      .from("asaas_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const sandbox = settings?.sandbox ?? false;
    const base = sandbox
      ? "https://sandbox.asaas.com/api/v3"
      : "https://api.asaas.com/v3";
    const headers = { "Content-Type": "application/json", access_token: apiKey };


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
    const paymentRes = await fetch(`${base}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: Number(data.value.toFixed(2)),
        dueDate: nextDueDate(Number(settings?.due_day ?? 10)),
        description: settings?.default_description
          ? `${settings.default_description} — ${data.description}`
          : data.description,
        fine: { value: Number(settings?.fine_percent ?? 0), type: "PERCENTAGE" },
        interest: { value: Number(settings?.interest_percent ?? 0) },
        ...(discountPercent > 0
          ? {
              discount: {
                value: discountPercent,
                dueDateLimitDays: Number(settings?.discount_deadline_days ?? 0),
                type: "PERCENTAGE",
              },
            }
          : {}),
        split: data.splits.map((s) => ({
          walletId: s.walletId,
          percentualValue: s.percentualValue,
        })),
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

    await supabaseAdmin

      .from("closures")
      .update({
        status: "invoice_generated",
        asaas_payment_id: payment.id,
        asaas_invoice_url: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
      })
      .eq("id", data.closureId);

    return {
      ok: true as const,
      paymentId: payment.id,
      invoiceUrl: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
    };
  });
