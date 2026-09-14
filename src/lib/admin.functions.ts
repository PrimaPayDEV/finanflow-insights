import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const companySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  document_cnpj: z.string().nullish(),
  asaas_api_key: z.string().nullish(),
});

export const getCompanies = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  const { data, error } = await supabaseAdmin
    .from("companies")
    .select("*, company_users(user_id, role)")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
});

export const upsertCompany = createServerFn({ method: "POST" })
  .validator((d: unknown) => companySchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (data.id) {
      const { error } = await supabaseAdmin
        .from("companies")
        .update({
          name: data.name,
          document_cnpj: data.document_cnpj,
          asaas_api_key: data.asaas_api_key,
        })
        .eq("id", data.id);
      
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("companies")
        .insert({
          name: data.name,
          document_cnpj: data.document_cnpj,
          asaas_api_key: data.asaas_api_key,
        });

      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const getAdminUsers = createServerFn({ method: "GET" })
  .validator((d: { companyId: string }) => d)
  .handler(async ({ data: { companyId } }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
       console.error("Error listing users:", error);
       return [];
    }

    // Get company_users for this company
    const { data: cu } = await supabaseAdmin
      .from("company_users")
      .select("user_id")
      .eq("company_id", companyId);

    const companyUserIds = cu?.map(c => c.user_id) || [];
    
    return users.users.filter(u => companyUserIds.includes(u.id));
  });

export const createCompanyAdmin = createServerFn({ method: "POST" })
  .validator(z.object({
    companyId: z.string().uuid(),
    email: z.string().email(),
    password: z.string().min(6),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Create User in Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });

    if (authError) throw new Error(authError.message);
    if (!authData.user) throw new Error("Usuário não criado");

    // 2. Link to Company
    const { error: linkError } = await supabaseAdmin
      .from("company_users")
      .insert({
        company_id: data.companyId,
        user_id: authData.user.id,
        role: "admin",
      });

    if (linkError) throw new Error(linkError.message);

    return { ok: true };
  });
