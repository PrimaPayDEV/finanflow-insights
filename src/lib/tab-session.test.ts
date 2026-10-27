import { describe, expect, it } from "vitest";
import { isAuthStorageKey, scopeFromLocation, scopedAuthKey } from "./tab-session";

describe("sub-links de ambiente", () => {
  it("/veicular fixa a aba em Proteção Veicular", () => {
    expect(scopeFromLocation("/veicular", "")).toBe("veicular");
    expect(scopeFromLocation("/veicular/", "")).toBe("veicular");
  });

  it("/ec e /imobiliaria fixam os outros ambientes", () => {
    expect(scopeFromLocation("/ec", "")).toBe("ec");
    expect(scopeFromLocation("/ec/", "")).toBe("ec");
    expect(scopeFromLocation("/imobiliaria", "")).toBe("imobiliaria");
    expect(scopeFromLocation("/imobiliaria/", "")).toBe("imobiliaria");
  });

  it("páginas e rotas de cada plataforma fixam seu respectivo ambiente", () => {
    expect(scopeFromLocation("/veicular/termos", "")).toBe("veicular");
    expect(scopeFromLocation("/veicular/eventos", "")).toBe("veicular");
    expect(scopeFromLocation("/vehicles", "")).toBe("veicular");
    expect(scopeFromLocation("/members", "")).toBe("veicular");
    expect(scopeFromLocation("/real-estate/charges", "")).toBe("imobiliaria");
    expect(scopeFromLocation("/merchants", "")).toBe("ec");
    expect(scopeFromLocation("/dashboard", "")).toBeNull();
    expect(scopeFromLocation("/", "")).toBeNull();
  });

  it("parâmetro ?env= fixa o ambiente em qualquer rota", () => {
    expect(scopeFromLocation("/login", "?env=ec")).toBe("ec");
    expect(scopeFromLocation("/login", "?env=veicular")).toBe("veicular");
    expect(scopeFromLocation("/dashboard", "?env=imobiliaria")).toBe("imobiliaria");
    expect(scopeFromLocation("/login", "")).toBeNull();
  });
});

describe("login guardado separado por ambiente", () => {
  const key = "sb-rorenkiwhqfqeinssvey-auth-token";

  it("cada ambiente usa uma gaveta de login diferente", () => {
    expect(scopedAuthKey(key, "ec")).toBe(`${key}::ec`);
    expect(scopedAuthKey(key, "veicular")).toBe(`${key}::veicular`);
    expect(scopedAuthKey(key, "imobiliaria")).toBe(`${key}::imobiliaria`);
    expect(scopedAuthKey(`${key}::ec`, "veicular")).toBe(`${key}::veicular`);
  });

  it("chaves de auth do Supabase (token, user, verifier) são identificadas", () => {
    expect(isAuthStorageKey(key)).toBe(true);
    expect(isAuthStorageKey(`${key}-user`)).toBe(true);
    expect(isAuthStorageKey(`${key}-code-verifier`)).toBe(true);
    expect(isAuthStorageKey("prima_env_url_ec")).toBe(false);
    expect(isAuthStorageKey("theme")).toBe(false);
  });
});
