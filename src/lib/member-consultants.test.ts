import { describe, expect, it } from "vitest";
import { buildConsultantSplits, memberConsultantIds, toggleConsultant } from "./member-consultants";

const consultants = [
  { id: "first", name: "Primeiro", asaas_wallet_id: "wallet-first", split_percent: 10 },
  { id: "second", name: "Segundo", asaas_wallet_id: "wallet-second", split_percent: 15 },
];

describe("member consultants", () => {
  it("keeps more than one selected consultant", () => {
    expect(toggleConsultant(toggleConsultant([], "first", true), "second", true)).toEqual(["first", "second"]);
    expect(memberConsultantIds({ partner_ids: ["first", "second"], partner_id: "first" })).toEqual(["first", "second"]);
  });
  it("removes a consultant without removing the other", () => {
    expect(toggleConsultant(["first", "second"], "first", false)).toEqual(["second"]);
  });
  it("preserves a legacy consultant", () => {
    expect(memberConsultantIds({ partner_ids: [], partner_id: "first" })).toEqual(["first"]);
  });
  it("sends the configured split for every consultant", () => {
    expect(buildConsultantSplits(["first", "second"], consultants)).toEqual([
      { walletId: "wallet-first", percentualValue: 10 },
      { walletId: "wallet-second", percentualValue: 15 },
    ]);
  });
  it("does not silently skip a consultant without a wallet", () => {
    expect(() => buildConsultantSplits(["first", "second"], [consultants[0] as typeof consultants[number], { ...consultants[1] as typeof consultants[number], asaas_wallet_id: null }])).toThrow("Segundo");
  });
  it("rejects consultants from another environment or missing records", () => {
    expect(() => buildConsultantSplits(["missing"], consultants)).toThrow("neste ambiente");
  });
  it("rejects a total above 100 percent", () => {
    expect(() => buildConsultantSplits(["first", "second"], consultants.map((p) => ({ ...p, split_percent: 60 })))).toThrow("100%");
  });
  it("groups commissions for the same wallet without losing either consultant", () => {
    expect(buildConsultantSplits(["first", "second"], consultants.map((p) => ({ ...p, asaas_wallet_id: "shared" })))).toEqual([{ walletId: "shared", percentualValue: 25 }]);
  });
  it("does not require splits for a direct member", () => {
    expect(buildConsultantSplits([], consultants)).toEqual([]);
  });
});