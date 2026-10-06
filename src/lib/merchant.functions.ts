import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const accessSchema = z.object({
  companyId: z.string().uuid(),
  merchantId: z.string().uuid(),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres")
});

export const createMerchantAccess = createServerFn({ method: "POST" })
  .validator((d: unknown) => accessSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Procurar ou Criar Usuário no Auth
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw new Error("Erro ao buscar usuários: " + listError.message);
    
    let user = listData.users.find(u => u.email === data.email);

    if (!user) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

      if (createError) {
        throw new Error("Erro ao criar login: " + createError.message);
      }
      user = newUser.user;
    } else {
      // Atualizar a senha
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password: data.password });
    }

    if (!user) throw new Error("Não foi possível gerar o usuário.");

    // 2. Vincular na tabela company_users
    const { data: existingLink } = await supabaseAdmin
      .from("company_users")
      .select("id")
      .eq("user_id", user.id)
      .eq("company_id", data.companyId)
      .single();

    if (existingLink) {
      const { error: updateError } = await supabaseAdmin
        .from("company_users")
        .update({ role: "merchant", merchant_id: data.merchantId })
        .eq("id", existingLink.id);
      
      if (updateError) throw new Error("Erro ao vincular (update): " + updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin
        .from("company_users")
        .insert({
          company_id: data.companyId,
          user_id: user.id,
          role: "merchant",
          merchant_id: data.merchantId
        });
        
      if (insertError) throw new Error("Erro ao vincular (insert): " + insertError.message);
    }

    return { success: true };
  });
