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
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().max(500),
  splits: z
    .array(z.object({ walletId: z.string().min(1), percentualValue: z.number().positive().max(100) }))
    .max(20)
    .default([]),
  sandbox: z.boolean().default(true),
});

export const checkAsaasConfigured = createServerFn({ method: "GET" }).handler(async () => ({
  configured: Boolean(process.env.ASAAS_API_KEY),
}));

export const createAsaasCharge = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.ASAAS_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "ASAAS_API_KEY não configurada no backend." };
    }
    const base = data.sandbox
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
    const paymentRes = await fetch(`${base}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: Number(data.value.toFixed(2)),
        dueDate: data.dueDate,
        description: data.description,
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

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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
