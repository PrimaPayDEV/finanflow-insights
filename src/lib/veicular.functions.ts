import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const cotacaoSchema = z.object({
  id: z.string().optional(),
  companyId: z.string().optional(),
  memberName: z.string().min(1, "Nome é obrigatório"),
  memberDocument: z.string().min(11, "CPF ou CNPJ inválido"),
  memberPhone: z.string().min(10, "WhatsApp com DDD é obrigatório"),
  memberEmail: z.string().email().optional().or(z.literal("")),
  memberCep: z.string().optional().or(z.literal("")),
  memberAddress: z.string().optional().or(z.literal("")),
  memberNumber: z.string().optional().or(z.literal("")),
  memberComplement: z.string().optional().or(z.literal("")),
  memberNeighborhood: z.string().optional().or(z.literal("")),
  memberCity: z.string().optional().or(z.literal("")),
  memberState: z.string().optional().or(z.literal("")),
  preferredDueDay: z.number().optional().default(20),
  consultantId: z.string().optional().or(z.literal("")),
  consultantName: z.string().optional(),
  vehicleType: z.enum(["carro", "moto", "pesado", "utilitario"]).default("carro"),
  vehiclePlate: z.string().min(7, "Placa do veículo é obrigatória"),
  vehicleBrand: z.string().min(1, "Marca é obrigatória"),
  vehicleModel: z.string().min(1, "Modelo é obrigatório"),
  vehicleYear: z.number().default(2022),
  vehicleColor: z.string().optional(),
  vehicleChassi: z.string().optional(),
  vehicleFipeValue: z.number().default(50000),
  vehicleUsage: z.enum(["particular", "comercial", "app"]).default("particular"),
  planName: z.string().optional().default("Plano Completo"),
  selectedProducts: z.array(z.string()).default([]),
  baseFee: z.number().default(119.9),
  productsFee: z.number().default(0),
  totalMonthlyFee: z.number().default(119.9),
  estimatedParticipationFee: z.number().default(2700),
  status: z.enum(["rascunho", "enviada", "aprovada", "efetivada", "cancelada", "aguardando_aceite"]).default("aguardando_aceite"),
  notes: z.string().optional(),
});

export const submitPublicCotacao = createServerFn({ method: "POST" })
  .validator((d: unknown) => cotacaoSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Identificar companyId padrão se não vier
    let targetCompanyId = data.companyId;
    if (!targetCompanyId || targetCompanyId === "default") {
      const { data: companies } = await supabaseAdmin
        .from("companies")
        .select("id, segment")
        .ilike("segment", "%veicular%")
        .limit(1);
      targetCompanyId = companies?.[0]?.id;
    }

    const cotacaoId = data.id || `cot-${Date.now()}`;
    const createdAt = new Date().toISOString();

    if (targetCompanyId) {
      const payload = { ...data, id: cotacaoId, companyId: targetCompanyId, createdAt };
      const { error } = await supabaseAdmin
        .from("vehicle_quotes")
        .upsert({ id: cotacaoId, company_id: targetCompanyId, payload: payload as never });
      if (error) console.error("vehicle_quotes insert", error);
    }

    // Se temos companyId, registra notificação para os operadores da plataforma
    if (targetCompanyId) {
      await supabaseAdmin.from("notifications").insert({
        company_id: targetCompanyId,
        type: "cotacao",
        title: "Nova Cotação Externa Recebida",
        description: `Cotação de ${data.memberName} (${data.vehicleBrand} ${data.vehicleModel} - Placa ${data.vehiclePlate.toUpperCase()}) no plano "${data.planName}" por R$ ${data.totalMonthlyFee.toFixed(2)}/mês. [cotacao:${cotacaoId}]`,
      });
    }

    return {
      ok: true,
      id: cotacaoId,
      createdAt,
      companyId: targetCompanyId,
      data,
    };
  });

