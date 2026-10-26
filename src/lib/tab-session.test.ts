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

  it("páginas internas não trocam o ambiente da aba", () => {
    expect(scopeFromLocation("/veicular/termos", "")).toBeNull();
    expect(scopeFromLocation("/dashboard", "")).toBeNull();
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
    expect(scopedAuthKey(key, "ec")).not.toBe(scopedAuthKey(key, "veicular"));
  });

  it("só a chave de login é separada", () => {
    expect(isAuthStorageKey(key)).toBe(true);
    expect(isAuthStorageKey("prima_env_url_ec")).toBe(false);
  });
});
