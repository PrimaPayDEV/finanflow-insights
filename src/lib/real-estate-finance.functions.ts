import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const generateChargeSchema = z.object({
  companyId: z.string().uuid(),
  contractId: z.string().uuid(),
  competence: z.string().min(6), // e.g., "2026-10"
  dueDate: z.string().min(10), // e.g., "2026-10-15"
  expensesAmount: z.number().min(0).default(0), // Additional expenses (IPTU, Condominium) to charge to tenant
});

export const generateRentCharge = createServerFn({ method: "POST" })
  .validator((d: unknown) => generateChargeSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Fetch Company for API Key
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("asaas_api_key")
      .eq("id", data.companyId)
      .single();

    const apiKey = company?.asaas_api_key || process.env.ASAAS_API_TESTE || process.env.ASAAS_API_KEY;

    if (!apiKey) {
      return { ok: false as const, error: "Chave da API do Asaas não configurada para esta empresa." };
    }

    const base = "https://sandbox.asaas.com/api/v3"; // Hardcoded to sandbox for demo, can be dynamic based on settings

    // 2. Fetch Contract Details
    const { data: contract, error: contractErr } = await supabaseAdmin
      .from("real_estate_contracts")
      .select("*, tenants:tenant_id(*), owners:owner_id(*)")
      .eq("id", data.contractId)
      .single();

    if (contractErr || !contract) {
      return { ok: false as const, error: "Contrato não encontrado." };
    }

    // 3. Ensure Tenant has Asaas Customer ID
    let customerId = contract.tenants.asaas_customer_id;
    if (!customerId) {
      const customerRes = await fetch(`${base}/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", access_token: apiKey },
        body: JSON.stringify({
          name: contract.tenants.name,
          cpfCnpj: contract.tenants.document.replace(/\D/g, ""),
          email: contract.tenants.email || undefined,
          phone: contract.tenants.phone || undefined,
        }),
      });
      const customerData = await customerRes.json();
      if (!customerRes.ok) {
        return { ok: false as const, error: `Erro ao criar cliente no Asaas: ${customerData.errors?.[0]?.description}` };
      }
      customerId = customerData.id;
      // Save customer ID
      await supabaseAdmin.from("real_estate_tenants").update({ asaas_customer_id: customerId }).eq("id", contract.tenant_id);
    }

    // 4. Calculate Financials
    const rentAmount = Number(contract.rent_amount);
    const expenses = Number(data.expensesAmount);
    const grossAmount = rentAmount + expenses;

    // Admin Fee (Imobiliária)
    let adminFeeAmount = 0;
    if (contract.admin_fee_type === 'PERCENTAGE') {
      adminFeeAmount = rentAmount * (Number(contract.admin_fee_value) / 100);
    } else {
      adminFeeAmount = Number(contract.admin_fee_value);
    }

    // Platform Fee (PrimaPay) - fixed fee of 3.00 for Boleto processing simulation
    const platformFeeAmount = 3.00; 

    // Owner receives rent minus admin fee and minus platform fee (or whoever absorbs it)
    // For this business model, owner gets: Rent - Admin Fee. (The admin fee already covers the platform fee, so we don't double deduct from owner)
    // Wait, the Asaas charge will have the Gross Amount.
    // If the Real Estate agency creates the charge, the money goes to the Agency's Asaas account.
    // So the split should send `ownerAmount` to the Owner's Wallet.
    // Let's assume the owner gets: rentAmount - adminFeeAmount
    const ownerAmount = rentAmount - adminFeeAmount;

    // 5. Create Asaas Split (if owner has wallet ID)
    const splits = [];
    if (contract.owners.asaas_wallet_id) {
      splits.push({
        walletId: contract.owners.asaas_wallet_id,
        fixedValue: ownerAmount,
      });
    }

    // 6. Create Charge in Asaas
    const chargePayload = {
      customer: customerId,
      billingType: "UNDEFINED", // Let customer choose (BOLETO or PIX)
      value: grossAmount,
      dueDate: data.dueDate,
      description: `Aluguel + Encargos | Ref: ${data.competence} | Imóvel ID: ${contract.property_id}`,
      split: splits.length > 0 ? splits : undefined,
    };

    const chargeRes = await fetch(`${base}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", access_token: apiKey },
      body: JSON.stringify(chargePayload),
    });

    const chargeData = await chargeRes.json();
    if (!chargeRes.ok) {
      return { ok: false as const, error: `Erro no Asaas: ${chargeData.errors?.[0]?.description}` };
    }

    // 7. Save Charge to Database
    const { error: insertErr } = await supabaseAdmin.from("real_estate_charges").insert({
      company_id: data.companyId,
      contract_id: contract.id,
      property_id: contract.property_id,
      owner_id: contract.owner_id,
      tenant_id: contract.tenant_id,
      competence: data.competence,
      due_date: data.dueDate,
      gross_amount: grossAmount,
      admin_fee_amount: adminFeeAmount,
      platform_fee_amount: platformFeeAmount,
      owner_amount: ownerAmount,
      expenses_amount: expenses,
      status: "PENDING",
      asaas_invoice_id: chargeData.id,
      asaas_payment_url: chargeData.invoiceUrl,
      metadata: { chargeData },
    });

    if (insertErr) {
      return { ok: false as const, error: insertErr.message };
    }

    return { ok: true as const, chargeUrl: chargeData.invoiceUrl };
  });
