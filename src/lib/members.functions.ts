import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { addDays, format, parseISO } from "date-fns";
import { getNextBusinessDay } from "./dateUtils";

const memberSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string().uuid(),
  name: z.string().min(1, "Nome é obrigatório"),
  document: z.string().min(11, "Documento inválido").max(18),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  partner_id: z.string().uuid().optional().or(z.literal("")),
  vehicle: z.object({
    id: z.string().uuid().optional(),
    plate: z.string().max(7).optional().or(z.literal("")),
    brand: z.string().optional().or(z.literal("")),
    model: z.string().optional().or(z.literal("")),
    year: z.number().optional(),
    category: z.string().optional().or(z.literal(""))
  }).optional()
});

export const getMembers = createServerFn({ method: "GET" })
  .validator((d: { companyId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members, error } = await supabaseAdmin
      .from("members")
      .select("*, vehicles(*), partners(id, name, split_percent, asaas_wallet_id)")
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

    const upsertData = {
      company_id: data.companyId,
      name: data.name,
      document: data.document,
      email: data.email || null,
      phone: data.phone || null,
      asaas_customer_id: asaasCustomerId || null,
      partner_id: data.partner_id || null,
    };

    let error;
    if (data.id) {
      // Update existing
      const { error: updateError } = await supabaseAdmin
        .from("members")
        .update(upsertData)
        .eq("id", data.id)
        .eq("company_id", data.companyId); // extra safety
      error = updateError;
    } else {
      // Insert new
      const { data: newMember, error: insertError } = await supabaseAdmin
        .from("members")
        .insert(upsertData)
        .select("id")
        .single();
      error = insertError;
      if (newMember?.id) {
        data.id = newMember.id;
        await supabaseAdmin.from("notifications").insert({
          company_id: data.companyId,
          type: "info",
          title: "Novo Associado",
          description: `O associado ${upsertData.name} foi cadastrado.`,
        });
      }
    }

    if (error) throw new Error(error.message);

    // Upsert vehicle if provided
    if (data.id && data.vehicle && (data.vehicle.plate || data.vehicle.brand || data.vehicle.model)) {
      const vData: any = {
        member_id: data.id,
        company_id: data.companyId,
        plate: (data.vehicle.plate || "").toUpperCase(),
        brand: data.vehicle.brand || "",
        model: data.vehicle.model || "",
        year: data.vehicle.year,
        category: data.vehicle.category || "Leves e utilitários",
      };
      
      if (data.vehicle.id) {
        const { error: vError } = await supabaseAdmin.from("vehicles").update(vData).eq("id", data.vehicle.id).eq("company_id", data.companyId);
        if (vError && (vError.message?.includes("category") || (vError as any).code === "42703")) {
          delete vData.category;
          await supabaseAdmin.from("vehicles").update(vData).eq("id", data.vehicle.id).eq("company_id", data.companyId);
        }
      } else {
        const { error: vError } = await supabaseAdmin.from("vehicles").insert(vData);
        if (vError && (vError.message?.includes("category") || (vError as any).code === "42703")) {
          delete vData.category;
          await supabaseAdmin.from("vehicles").insert(vData);
        }
      }
    }

    return { ok: true };
  });

export const deleteMember = createServerFn({ method: "POST" })
  .validator((d: { id: string; companyId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("members")
      .delete()
      .eq("id", data.id)
      .eq("company_id", data.companyId);
    
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getVehicles = createServerFn({ method: "GET" })
  .validator((d: { companyId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: vehicles, error } = await supabaseAdmin
      .from("vehicles")
      .select("*, members(id, name, document, phone, email, partner_id, partners(id, name))")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return vehicles || [];
  });

export const addVehicle = createServerFn({ method: "POST" })
  .validator((d: { memberId: string; companyId: string; plate: string; brand: string; model: string; year?: number; color?: string; category?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const vData: any = {
      member_id: data.memberId,
      company_id: data.companyId,
      plate: data.plate.toUpperCase().trim(),
      brand: data.brand,
      model: data.model,
      year: data.year,
      color: data.color || null,
      category: data.category || "Leves e utilitários",
    };
    const { error } = await supabaseAdmin.from("vehicles").insert(vData);
    if (error) {
      if (error.message?.includes("category") || (error as any).code === "42703") {
        delete vData.category;
        const { error: retryError } = await supabaseAdmin.from("vehicles").insert(vData);
        if (retryError) throw new Error(retryError.message);
      } else {
        throw new Error(error.message);
      }
    }
    return { ok: true };
  });

export const deleteVehicle = createServerFn({ method: "POST" })
  .validator((d: { id: string; companyId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("vehicles")
      .delete()
      .eq("id", data.id)
      .eq("company_id", data.companyId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const generateInvoice = createServerFn({ method: "POST" })
  .validator((d: { companyId: string; memberId: string; amount: number; description: string; dueDate?: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: member } = await supabaseAdmin
      .from("members")
      .select("asaas_customer_id, document, name, email, phone, partner_id, partners(id, name, asaas_wallet_id, split_percent)")
      .eq("id", data.memberId)
      .single();
    if (!member) throw new Error("Associado não encontrado");

    let customerId = member.asaas_customer_id;

    const { data: company } = await supabaseAdmin.from("companies").select("asaas_api_key, name, app_mode, segment").eq("id", data.companyId).single();
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

    const targetDate = data.dueDate ? parseISO(data.dueDate) : addDays(new Date(), 5);
    const dueDate = format(getNextBusinessDay(targetDate), "yyyy-MM-dd");

    // Identificar ambiente Planmais / Proteção Veicular
    const isPlanmais = company?.app_mode === "billing" || company?.segment === "veicular" || (company?.name || "").toLowerCase().includes("planmais");
    
    let partner = Array.isArray(member.partners) ? member.partners[0] : (member.partners as any);
    if (!partner && member.partner_id) {
      const { data: pDb } = await supabaseAdmin
        .from("partners")
        .select("id, name, asaas_wallet_id, split_percent")
        .eq("id", member.partner_id)
        .maybeSingle();
      partner = pDb;
    }
    
    const baseDescription = data.description?.trim() || "Cobrança de Proteção Veicular";
    const description = isPlanmais
      ? `${baseDescription} — NÃO RECEBER APÓS O VENCIMENTO`.slice(0, 500)
      : baseDescription;

    const paymentPayload: any = {
      customer: customerId,
      billingType: "BOLETO",
      value: Number(data.amount.toFixed(2)),
      dueDate,
      description,
      ...(isPlanmais
        ? {
            // No ambiente Planmais, os boletos não podem ser pagos após o vencimento
            daysAfterDueDateToRegistrationCancellation: 0,
            fine: { value: 0 },
            interest: { value: 0 },
          }
        : {
            ...(Number(settings?.fine_percent ?? 0) > 0 ? { fine: { value: Number(settings?.fine_percent ?? 0), type: "PERCENTAGE" } } : {}),
            ...(Number(settings?.interest_percent ?? 0) > 0 ? { interest: { value: Number(settings?.interest_percent ?? 0) } } : {}),
          }),
    };

    const splitPercent = partner?.split_percent ? Number(partner.split_percent) : 0;
    const walletId = partner?.asaas_wallet_id ? String(partner.asaas_wallet_id).trim() : "";

    if (walletId && !isNaN(splitPercent) && splitPercent > 0) {
      paymentPayload.split = [
        {
          walletId,
          percentualValue: Number(splitPercent.toFixed(2)),
        }
      ];
    }

    const paymentRes = await fetch(`${base}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify(paymentPayload),
    });

    const paymentJson = (await paymentRes.json()) as { id?: string; errors?: any[] };
    if (!paymentJson.id) {
      throw new Error("Erro do Asaas: " + (paymentJson.errors?.[0]?.description ?? JSON.stringify(paymentJson.errors)));
    }

    await supabaseAdmin.from("notifications").insert({
      company_id: data.companyId,
      type: "closure",
      title: "Fatura Gerada",
      description: `Fatura de R$ ${data.amount.toFixed(2)} gerada para o associado ${member.name}.`,
    });

    return { ok: true, invoiceId: paymentJson.id };
  });

export const importBatchMembers = createServerFn({ method: "POST" })
  .validator((d: {
    companyId: string;
    items: Array<{
      name: string;
      document: string;
      phone?: string;
      email?: string;
      vehicle: {
        plate: string;
        brand: string;
        model: string;
        year: number;
        category: string;
        color?: string;
      };
    }>;
  }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let membersAdded = 0;
    let vehiclesAdded = 0;

    // Obter associados existentes por documento na empresa
    const { data: existingMembers } = await supabaseAdmin
      .from("members")
      .select("id, document")
      .eq("company_id", data.companyId);

    const memberMap = new Map<string, string>();
    (existingMembers || []).forEach((m) => {
      const clean = (m.document || "").replace(/\D/g, "");
      if (clean) memberMap.set(clean, m.id);
    });

    // Obter veículos existentes por placa na empresa
    const { data: existingVehicles } = await supabaseAdmin
      .from("vehicles")
      .select("id, plate")
      .eq("company_id", data.companyId);

    const vehicleSet = new Set<string>();
    (existingVehicles || []).forEach((v) => {
      const cleanPlate = (v.plate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
      if (cleanPlate) vehicleSet.add(cleanPlate);
    });

    for (const item of data.items) {
      const cleanDoc = (item.document || "").replace(/\D/g, "");
      let memberId = memberMap.get(cleanDoc);

      if (!memberId) {
        // Inserir novo associado
        const { data: newMem, error: memError } = await supabaseAdmin
          .from("members")
          .insert({
            company_id: data.companyId,
            name: item.name.trim(),
            document: item.document.trim(),
            phone: item.phone?.trim() || null,
            email: item.email?.trim() || null,
          })
          .select("id")
          .single();

        if (memError) {
          console.error("Erro ao inserir associado do lote:", item.name, memError.message);
          continue;
        }

        if (newMem?.id) {
          memberId = newMem.id;
          memberMap.set(cleanDoc, memberId);
          membersAdded++;
        }
      }

      if (memberId && item.vehicle) {
        const cleanPlate = (item.vehicle.plate || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (!vehicleSet.has(cleanPlate)) {
          const vData: any = {
            member_id: memberId,
            company_id: data.companyId,
            plate: cleanPlate,
            brand: item.vehicle.brand || "",
            model: item.vehicle.model || "",
            year: item.vehicle.year || new Date().getFullYear(),
            color: item.vehicle.color || null,
            category: item.vehicle.category || "Leves e utilitários",
          };

          const { error: vehError } = await supabaseAdmin.from("vehicles").insert(vData);
          if (vehError) {
            if (vehError.message?.includes("category") || (vehError as any).code === "42703") {
              delete vData.category;
              const { error: retryError } = await supabaseAdmin.from("vehicles").insert(vData);
              if (!retryError) {
                vehicleSet.add(cleanPlate);
                vehiclesAdded++;
              }
            }
          } else {
            vehicleSet.add(cleanPlate);
            vehiclesAdded++;
          }
        }
      }
    }

    if (membersAdded > 0 || vehiclesAdded > 0) {
      await supabaseAdmin.from("notifications").insert({
        company_id: data.companyId,
        type: "info",
        title: "Lote de Associados Hinova Importado",
        description: `${membersAdded} associados e ${vehiclesAdded} veículos foram adicionados com sucesso à plataforma.`,
      });
    }

    return {
      ok: true,
      membersAdded,
      vehiclesAdded,
      totalProcessed: data.items.length,
    };
  });

