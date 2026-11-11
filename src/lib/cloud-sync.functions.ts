import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const pushCloudSyncData = createServerFn({ method: "POST" })
  .validator(
    (d: {
      companyId: string;
      data: Record<string, any>;
    }) => d
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { companyId, data: payloadMap } = data;

    if (!companyId || !payloadMap) return { ok: false, error: "Dados inválidos" };

    const entries = Object.entries(payloadMap);
    for (const [cacheKey, payload] of entries) {
      if (!payload || (typeof payload === "object" && Object.keys(payload).length === 0)) {
        continue;
      }

      // 1. Grava no cache central de sincronização
      try {
        await supabaseAdmin.from("platform_cloud_cache" as any).upsert(
          {
            company_id: companyId,
            cache_key: cacheKey,
            payload,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: "company_id,cache_key" }
        );
      } catch (err) {
        console.error(`Erro ao salvar cache ${cacheKey}:`, err);
      }

      // 2. Desdobra dados específicos para as tabelas principais
      if (cacheKey === "members_extra" && typeof payload === "object") {
        for (const [memberId, extra] of Object.entries(payload as Record<string, any>)) {
          if (!memberId || !extra) continue;
          const patch: any = { extra_data: extra };
          if (typeof extra.customMonthlyFee === "number" && extra.customMonthlyFee > 0) {
            patch.monthly_fee = extra.customMonthlyFee;
          }
          if (typeof extra.dueDay === "number" && extra.dueDay >= 1 && extra.dueDay <= 31) {
            patch.due_day = extra.dueDay;
          }
          try {
            await supabaseAdmin.from("members").update(patch).eq("id", memberId);
          } catch {}
        }
      }

      if (cacheKey === "member_due_days" && typeof payload === "object") {
        for (const [memberId, dueDay] of Object.entries(payload as Record<string, number>)) {
          if (typeof dueDay === "number" && dueDay >= 1 && dueDay <= 31) {
            try {
              await supabaseAdmin.from("members").update({ due_day: dueDay }).eq("id", memberId);
            } catch {}
          }
        }
      }

      if (cacheKey === "vehicles_extra" && typeof payload === "object") {
        for (const [vKey, vExtra] of Object.entries(payload as Record<string, any>)) {
          if (!vKey || !vExtra) continue;
          const vPatch: any = { extra_data: vExtra };
          if (vExtra.fipeValue) vPatch.fipe_value = vExtra.fipeValue;
          if (vExtra.color) vPatch.color = vExtra.color;
          if (vExtra.monthlyFee) vPatch.monthly_fee = vExtra.monthlyFee;

          try {
            if (vKey.startsWith("PLATE_")) {
              const plate = vKey.replace("PLATE_", "").toUpperCase();
              await supabaseAdmin.from("vehicles").update(vPatch).eq("plate", plate);
            } else {
              await supabaseAdmin.from("vehicles").update(vPatch).eq("id", vKey);
            }
          } catch {}
        }
      }
    }

    return { ok: true, syncedCount: entries.length };
  });

export const pullCloudSyncData = createServerFn({ method: "GET" })
  .validator((d: { companyId: string }) => d)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { companyId } = data;

    if (!companyId) return { ok: false, data: {} };

    const { data: rows, error } = await supabaseAdmin
      .from("platform_cloud_cache" as any)
      .select("cache_key, payload, updated_at")
      .eq("company_id", companyId);

    if (error) {
      console.warn("platform_cloud_cache não disponível ainda:", error.message);
      return { ok: false, data: {} };
    }

    const result: Record<string, any> = {};
    let latestUpdate = "";
    (rows || []).forEach((r: any) => {
      result[r.cache_key] = r.payload;
      if (!latestUpdate || (r.updated_at && r.updated_at > latestUpdate)) {
        latestUpdate = r.updated_at;
      }
    });

    return { ok: true, data: result, updatedAt: latestUpdate };
  });

