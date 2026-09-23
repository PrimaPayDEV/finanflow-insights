import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const memberSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  document: z.string().min(11, "Documento inválido").max(18),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

export const getMembers = createServerFn({ method: "GET" })
  .validator((d: { companyId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members, error } = await supabaseAdmin
      .from("members")
      .select("*, vehicles(*)")
      .eq("company_id", data.companyId)
      .order("name");

    if (error) throw new Error(error.message);
    return members || [];
  });

export const upsertMember = createServerFn({ method: "POST" })
  .validator((d: unknown) => memberSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Get Asaas API key to create customer
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

    let asaasCustomerId: string | undefined = undefined;

    // Create/Find Asaas Customer if API key exists
    if (apiKey) {
      const base = sandbox
        ? "https://sandbox.asaas.com/api/v3"
        : "https://api.asaas.com/v3";
      const headers = {
        "Content-Type": "application/json",
        "User-Agent": "PrimaHub",
        access_token: apiKey,
      };

      const found = await fetch(`${base}/customers?cpfCnpj=${encodeURIComponent(data.document)}`, { headers });
      const foundJson = (await found.json()) as { data?: Array<{ id: string }> };
      asaasCustomerId = foundJson.data?.[0]?.id;

      if (!asaasCustomerId) {
        const created = await fetch(`${base}/customers`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: data.name,
            cpfCnpj: data.document,
            email: data.email || undefined,
            mobilePhone: data.phone || undefined,
          }),
        });
        const createdJson = (await created.json()) as { id?: string; errors?: any[] };
        if (createdJson.id) {
          asaasCustomerId = createdJson.id;
        } else {
          console.error("Falha ao criar Asaas Customer:", createdJson.errors);
        }
      }
    }

    const { error } = await supabaseAdmin
      .from("members")
      .insert({
        company_id: data.companyId,
        name: data.name,
        document: data.document,
        email: data.email || null,
        phone: data.phone || null,
        asaas_customer_id: asaasCustomerId || null,
      });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addVehicle = createServerFn({ method: "POST" })
  .validator((d: { memberId: string; companyId: string; plate: string; brand: string; model: string; year?: number }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("vehicles").insert({
      member_id: data.memberId,
      company_id: data.companyId,
      plate: data.plate.toUpperCase(),
      brand: data.brand,
      model: data.model,
      year: data.year,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateInvoice = createServerFn({ method: "POST" })
  .validator((d: { companyId: string; memberId: string; amount: number; description: string; dueDate?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member } = await supabaseAdmin.from("members").select("asaas_customer_id, document, name, email, phone").eq("id", data.memberId).single();
    if (!member) throw new Error("Associado não encontrado");

    let customerId = member.asaas_customer_id;

    const { data: company } = await supabaseAdmin.from("companies").select("asaas_api_key").eq("id", data.companyId).single();
    const { data: settings } = await supabaseAdmin.from("asaas_settings").select("*").eq("company_id", data.companyId).limit(1).maybeSingle();

    const sandbox = settings?.sandbox ?? false;
    const apiKey = company?.asaas_api_key || (sandbox ? process.env.ASAAS_API_TESTE : process.env.ASAAS_API_KEY);

    if (!apiKey) throw new Error("Chave da API do Asaas não configurada.");

    const base = sandbox ? "https://sandbox.asaas.com/api/v3" : "https://api.asaas.com/v3";
    const headers = { "Content-Type": "application/json", "User-Agent": "PrimaHub", access_token: apiKey };

    if (!customerId) {
        const created = await fetch(`${base}/customers`, {
          method: "POST",
          headers,
          body: JSON.stringify({ name: member.name, cpfCnpj: member.document, email: member.email || undefined, mobilePhone: member.phone || undefined }),
        });
        const createdJson = (await created.json()) as { id?: string; errors?: any[] };
        if (createdJson.id) {
          customerId = createdJson.id;
          await supabaseAdmin.from("members").update({ asaas_customer_id: customerId }).eq("id", data.memberId);
        } else {
          throw new Error("Falha ao criar cliente no Asaas: " + JSON.stringify(createdJson.errors));
        }
    }

    const dueDate = data.dueDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const paymentRes = await fetch(`${base}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: customerId,
        billingType: "BOLETO",
        value: Number(data.amount.toFixed(2)),
        dueDate,
        description: data.description,
      }),
    });

    const paymentJson = (await paymentRes.json()) as { id?: string; errors?: any[] };
    if (!paymentJson.id) {
      throw new Error("Erro do Asaas: " + (paymentJson.errors?.[0]?.description ?? JSON.stringify(paymentJson.errors)));
    }

    return { ok: true, invoiceId: paymentJson.id };
  });
