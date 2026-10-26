import { afterEach, describe, expect, it, vi } from "vitest";
import { detectEnvironmentFromHostname, resolvePlatformUrl } from "./environment";

function setHost(hostname: string) {
  vi.stubGlobal("window", { location: { hostname, origin: `https://${hostname}` } });
  vi.stubGlobal("localStorage", { getItem: () => null });
}

afterEach(() => vi.unstubAllGlobals());

describe("ambiente por endereço", () => {
  it("veicular.primapay.com.br abre Proteção Veicular", () => {
    setHost("veicular.primapay.com.br");
    expect(detectEnvironmentFromHostname()).toBe("veicular");
  });

  it("imob.primapay.com.br abre Imobiliária", () => {
    setHost("imob.primapay.com.br");
    expect(detectEnvironmentFromHostname()).toBe("imobiliaria");
  });

  it("endereço principal não força nenhum ambiente", () => {
    setHost("primahubserv.lovable.app");
    expect(detectEnvironmentFromHostname()).toBeNull();
  });

  it("no domínio próprio, o login veicular vai para o endereço próprio", () => {
    setHost("ec.primapay.com.br");
    expect(resolvePlatformUrl("veicular", "/login?env=veicular")).toBe(
      "https://veicular.primapay.com.br/login?env=veicular",
    );
  });

  it("no endereço principal, o login continua interno", () => {
    setHost("primahubserv.lovable.app");
    expect(resolvePlatformUrl("veicular", "/login?env=veicular")).toBe("/login?env=veicular");
  });
});
