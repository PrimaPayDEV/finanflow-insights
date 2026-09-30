import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  event: z.string().max(100),
  payment: z
    .object({
      id: z.string().max(100),
      customer: z.string().max(100).optional(),
      value: z.number().optional(),
      paymentDate: z.string().max(40).optional().nullable(),
      status: z.string().max(50).optional(),
    })
    .optional(),
});

const PAID_EVENTS = new Set([
  "PAYMENT_RECEIVED",
  "PAYMENT_CONFIRMED",
  "PAYMENT_RECEIVED_IN_CASH",
]);
const REVERTED_EVENTS = new Set([
  "PAYMENT_REFUNDED",
  "PAYMENT_CHARGEBACK_REQUESTED",
  "PAYMENT_DELETED",
  "PAYMENT_RESTORED",
  "PAYMENT_OVERDUE",
]);

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const companyId = url.searchParams.get("company_id");
        
        if (!companyId) {
          return new Response("Missing company_id", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: company } = await supabaseAdmin
          .from("companies")
          .select("asaas_webhook_token")
          .eq("id", companyId)
          .single();

        const expectedToken = company?.asaas_webhook_token || process.env["ASAAS_WEBHOOK_TOKEN"];
        
        if (expectedToken) {
          const token = request.headers.get("asaas-access-token");
          if (token !== expectedToken) {
            return new Response("Unauthorized", { status: 401 });
          }
        }

        let parsed: z.infer<typeof payloadSchema>;
        try {
          parsed = payloadSchema.parse(await request.json());
        } catch {
          return new Response("Invalid payload", { status: 400 });
        }


        await supabaseAdmin.from("asaas_webhook_events").insert({
          event: parsed.event,
          asaas_payment_id: parsed.payment?.id ?? null,
          payload: JSON.parse(JSON.stringify(parsed)),
          company_id: companyId,
        });

        const paymentId = parsed.payment?.id;
        if (paymentId) {
          if (PAID_EVENTS.has(parsed.event)) {
            const closureUpdate = await supabaseAdmin
              .from("closures")
              .update({
                status: "paid",
                paid_at: parsed.payment?.paymentDate
                  ? new Date(parsed.payment.paymentDate).toISOString()
                  : new Date().toISOString(),
                paid_amount: parsed.payment?.value ?? null,
              })
              .eq("asaas_payment_id", paymentId)
              .eq("company_id", companyId)
              .select("merchants(name)")
              .single();
              
            if (closureUpdate.data?.merchants?.name) {
              await supabaseAdmin.from("notifications").insert({
                company_id: companyId,
                type: "payment",
                title: "Pagamento Recebido",
                description: `Fatura de R$ ${parsed.payment?.value?.toFixed(2)} do EC ${closureUpdate.data.merchants.name} foi paga.`,
              });
            } else if (parsed.payment?.customer) {
              const memberRes = await supabaseAdmin.from("members").select("name").eq("asaas_customer_id", parsed.payment.customer).eq("company_id", companyId).maybeSingle();
              if (memberRes.data?.name) {
                await supabaseAdmin.from("notifications").insert({
                  company_id: companyId,
                  type: "payment",
                  title: "Pagamento Recebido",
                  description: `A fatura de R$ ${parsed.payment?.value?.toFixed(2)} do associado ${memberRes.data.name} foi paga.`,
                });
              }
            }
          } else if (REVERTED_EVENTS.has(parsed.event)) {
            const closureUpdate = await supabaseAdmin
              .from("closures")
              .update({ status: "invoice_generated", paid_at: null, paid_amount: null })
              .eq("asaas_payment_id", paymentId)
              .eq("company_id", companyId)
              .select("merchants(name)")
              .single();
              
            if (closureUpdate.data?.merchants?.name) {
              await supabaseAdmin.from("notifications").insert({
                company_id: companyId,
                type: "error",
                title: "Pagamento Revertido",
                description: `A cobrança do EC ${closureUpdate.data.merchants.name} teve seu status revertido no Asaas.`,
              });
            } else if (parsed.payment?.customer) {
              const memberRes = await supabaseAdmin.from("members").select("name").eq("asaas_customer_id", parsed.payment.customer).eq("company_id", companyId).maybeSingle();
              if (memberRes.data?.name) {
                await supabaseAdmin.from("notifications").insert({
                  company_id: companyId,
                  type: "error",
                  title: "Pagamento Revertido",
                  description: `A cobrança do associado ${memberRes.data.name} teve seu status revertido no Asaas.`,
                });
              }
            }
          }
        }

        return Response.json({ received: true });
      },
    },
  },
});
