import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const companySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Nome é obrigatório"),
  document_cnpj: z.string().nullish(),
  asaas_api_key: z.string().nullish(),
  segment: z.string().nullish(),
  app_mode: z.enum(['full', 'billing']).default('full').nullish(),
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
          segment: data.segment,
          app_mode: data.app_mode ?? 'full',
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
          segment: data.segment,
          app_mode: data.app_mode ?? 'full',
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

export const toggleCompanyStatus = createServerFn({ method: "POST" })
  .validator(z.object({ companyId: z.string().uuid(), isActive: z.boolean() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("companies")
      .update({ is_active: data.isActive })
      .eq("id", data.companyId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCompany = createServerFn({ method: "POST" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // This will cascade delete everything linked to the company
    const { error } = await supabaseAdmin
      .from("companies")
      .delete()
      .eq("id", data.companyId);

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const grantPlatformAdminAccess = createServerFn({ method: "POST" })
  .validator(z.object({ companyId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Get current user from context
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser();
    const user = authData?.user;
    if (!user) throw new Error("Não autenticado");

    // Check if platform admin
    const email = user.email || "";
    if (email !== "contato@primapay.com.br" && email !== "financeiro@primapay.com.br") {
      throw new Error("Ação permitida apenas para administradores da plataforma PrimaPay");
    }

    // Insert into company_users if not exists
    const { error: insertError } = await supabaseAdmin
      .from("company_users")
      .upsert({
        user_id: user.id,
        company_id: data.companyId,
        role: "admin"
      }, { onConflict: "company_id, user_id" });

    if (insertError) throw new Error(insertError.message);
    return { ok: true };
  });

export const bootstrapPrimaAdmin = createServerFn({ method: "POST" })
  .validator(z.object({ email: z.string().email(), password: z.string().optional() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase().trim();
    if (email !== "contato@primapay.com.br" && email !== "financeiro@primapay.com.br") {
      throw new Error("E-mail não autorizado para bootstrap de admin.");
    }

    // 1. Procurar ou Criar Usuário no Auth
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw new Error("Erro ao listar usuários: " + listError.message);

    let user = listData.users.find((u) => u.email?.toLowerCase() === email);

    if (!user) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: data.password || "Marina31#@",
        email_confirm: true,
      });
      if (createError) throw new Error("Erro ao criar usuário admin: " + createError.message);
      user = newUser.user;
    } else {
      // Garantir confirmação de e-mail e atualizar senha se informada
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        ...(data.password ? { password: data.password } : {}),
      });
    }

    if (!user) throw new Error("Usuário não encontrado ou não pôde ser criado.");

    // 2. Localizar ou criar empresa principal
    const { data: companies, error: compError } = await supabaseAdmin
      .from("companies")
      .select("id, name")
      .order("created_at", { ascending: true });

    if (compError) throw new Error("Erro ao buscar empresas: " + compError.message);

    let targetCompany = (companies || []).find(
      (c) => c.name?.toLowerCase().includes("prima")
    ) || (companies && companies[0]);

    if (!targetCompany) {
      const { data: newComp, error: newCompErr } = await supabaseAdmin
        .from("companies")
        .insert({
          name: "Prima Hub",
          is_active: true,
          app_mode: "full",
        })
        .select()
        .single();
      if (newCompErr) throw new Error("Erro ao criar empresa Prima Hub: " + newCompErr.message);
      targetCompany = newComp;
    }

    // 3. Vincular em company_users com role: admin
    const { data: existingLink } = await supabaseAdmin
      .from("company_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", targetCompany.id)
      .maybeSingle();

    if (existingLink) {
      await supabaseAdmin
        .from("company_users")
        .update({ role: "admin" })
        .eq("id", existingLink.id);
    } else {
      await supabaseAdmin
        .from("company_users")
        .insert({
          company_id: targetCompany.id,
          user_id: user.id,
          role: "admin",
        });
    }

    // 4. Inserir em user_roles com role: admin
    try {
      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: user.id, role: "admin" as any }, { onConflict: "user_id, role" });
    } catch (e) {
      console.warn("user_roles upsert skipped or not applicable", e);
    }

    return {
      success: true,
      userId: user.id,
      companyId: targetCompany.id,
      companyName: targetCompany.name,
    };
  });
