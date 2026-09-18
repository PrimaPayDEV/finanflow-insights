import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPartners = createServerFn({ method: "GET" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data: input }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("partners")
      .select("*")
      .eq("company_id", input.companyId)
      .order("name");

    if (error) throw new Error(error.message);
    return data;
  });

export const upsertPartner = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(1, "Nome é obrigatório"),
      email: z.string().email("E-mail inválido").optional().or(z.literal("")),
      asaas_wallet_id: z.string().min(1, "Wallet ID é obrigatório"),
      companyId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      email: data.email || null,
      asaas_wallet_id: data.asaas_wallet_id,
      company_id: data.companyId,
    };

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("partners")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("partners")
        .insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deletePartner = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partners")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createPartnerUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      partnerId: z.string().uuid(),
      companyId: z.string().uuid(),
      email: z.string().email(),
      password: z.string().min(6),
    })
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Create user in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Erro desconhecido ao criar usuário");

    // Link user to partner in company_users
    const { error: linkError } = await supabaseAdmin
      .from("company_users")
      .insert({
        company_id: data.companyId,
        user_id: authData.user.id,
        role: "partner",
        partner_id: data.partnerId,
      });

    if (linkError) throw new Error(linkError.message);

    return { ok: true };
  });
