import { afterEach, describe, expect, it, vi } from "vitest";
import { getMemberDueDay, setMemberDueDay } from "./veicular";

afterEach(() => vi.unstubAllGlobals());

describe("member billing due day", () => {
  it("keeps saved day 15 even when the browser has an old day 20", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    setMemberDueDay("company", "member", 20);
    expect(getMemberDueDay("company", "member", 15)).toBe(15);
  });

  it("keeps day 15 in another browser without local preferences", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => null });
    expect(getMemberDueDay("company", "member", 15)).toBe(15);
  });

  it("preserves legacy day 15 until the member is saved", () => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ member: 15 }) });
    expect(getMemberDueDay("company", "member", null)).toBe(15);
  });
});