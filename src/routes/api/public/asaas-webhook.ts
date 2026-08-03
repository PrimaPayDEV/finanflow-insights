import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const payloadSchema = z.object({
  event: z.string().max(100),
  payment: z
    .object({
      id: z.string().max(100),
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
        const expectedToken = process.env["ASAAS_WEBHOOK_TOKEN"];
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

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        await supabaseAdmin.from("asaas_webhook_events").insert({
          event: parsed.event,
          asaas_payment_id: parsed.payment?.id ?? null,
          payload: JSON.parse(JSON.stringify(parsed)),
        });

        const paymentId = parsed.payment?.id;
        if (paymentId) {
          if (PAID_EVENTS.has(parsed.event)) {
            await supabaseAdmin
              .from("closures")
              .update({
                status: "paid",
                paid_at: parsed.payment?.paymentDate
                  ? new Date(parsed.payment.paymentDate).toISOString()
                  : new Date().toISOString(),
                paid_amount: parsed.payment?.value ?? null,
              })
              .eq("asaas_payment_id", paymentId);
          } else if (REVERTED_EVENTS.has(parsed.event)) {
            await supabaseAdmin
              .from("closures")
              .update({ status: "invoice_generated", paid_at: null, paid_amount: null })
              .eq("asaas_payment_id", paymentId);
          }
        }

        return Response.json({ received: true });
      },
    },
  },
});
