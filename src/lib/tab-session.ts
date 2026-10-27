import { detectEnvironmentFromHostname } from "./environment";

/**
 * Login independente por ambiente no mesmo endereço.
 *
 * Cada ambiente (ECs, Proteção Veicular, Imobiliária) funciona como uma
 * plataforma independente, com seu próprio link, login e armazenamento isolado.
 *
 * A gaveta de armazenamento do Supabase e o BroadcastChannel de cada aba
 * são vinculados ao ambiente ativo da aba.
 */

export type SessionScope = "ec" | "veicular" | "imobiliaria";

export const SESSION_SCOPES: SessionScope[] = ["ec", "veicular", "imobiliaria"];

/** Sub-link de entrada de cada ambiente. */
export const ENTRY_PATHS: Record<SessionScope, string> = {
  ec: "/ec",
  veicular: "/veicular",
  imobiliaria: "/imobiliaria",
};

const TAB_KEY = "prima_tab_env";
// Captura qualquer chave do cliente de autenticação Supabase (token, user, verifier, etc.)
const AUTH_KEY_RE = /^sb-[a-z0-9_-]+-auth-token/i;

function isScope(value: unknown): value is SessionScope {
  return typeof value === "string" && (SESSION_SCOPES as string[]).includes(value);
}

/**
 * Detecta o ambiente a partir da URL (parâmetro ?env= ou prefixo de rota).
 */
export function scopeFromLocation(pathname: string, search?: string): SessionScope | null {
  // 1. Parâmetro de busca (?env=...) tem prioridade explícita
  if (search) {
    try {
      const env = new URLSearchParams(search).get("env");
      if (isScope(env)) return env;
    } catch {
      /* ignore */
    }
  }

  const clean = (pathname || "").replace(/\/+$/, "") || "/";

  // 2. Rotas do ecossistema de Proteção Veicular
  if (
    clean === "/veicular" ||
    clean.startsWith("/veicular/") ||
    clean === "/vehicles" ||
    clean.startsWith("/vehicles/") ||
    clean === "/members" ||
    clean.startsWith("/members/")
  ) {
    return "veicular";
  }

  // 3. Rotas do ecossistema de Gestão Imobiliária
  if (
    clean === "/imobiliaria" ||
    clean.startsWith("/imobiliaria/") ||
    clean === "/real-estate" ||
    clean.startsWith("/real-estate/")
  ) {
    return "imobiliaria";
  }

  // 4. Rotas do ecossistema de Estabelecimentos Comerciais (EC)
  if (
    clean === "/ec" ||
    clean.startsWith("/ec/") ||
    clean === "/merchants" ||
    clean.startsWith("/merchants/") ||
    clean === "/closures" ||
    clean.startsWith("/closures/") ||
    clean === "/expenses" ||
    clean.startsWith("/expenses/") ||
    clean === "/import" ||
    clean.startsWith("/import/") ||
    clean === "/reports" ||
    clean.startsWith("/reports/") ||
    clean.startsWith("/recebiveis") ||
    clean.startsWith("/settings/asaas")
  ) {
    return "ec";
  }

  return null;
}

/** True para as chaves em que o login fica guardado no navegador. */
export function isAuthStorageKey(key: string): boolean {
  return AUTH_KEY_RE.test(key);
}

/** Nome da gaveta de login de um ambiente. Sem ambiente, usa a gaveta original. */
export function scopedAuthKey(key: string, scope: SessionScope | null): string {
  if (!scope) return key;
  // Remove sufixo anterior se já existir para evitar duplicação (ex: ::ec::ec)
  const baseKey = key.replace(/::(ec|veicular|imobiliaria)$/, "");
  return `${baseKey}::${scope}`;
}

// Funções originais, para ler/gravar sem passar pelo redirecionamento.
let rawGet: ((this: Storage, key: string) => string | null) | null = null;
let rawSet: ((this: Storage, key: string, value: string) => void) | null = null;

function readRaw(storage: Storage, key: string): string | null {
  try {
    return (rawGet ?? Storage.prototype.getItem).call(storage, key);
  } catch {
    return null;
  }
}

function writeRaw(storage: Storage, key: string, value: string) {
  try {
    (rawSet ?? Storage.prototype.setItem).call(storage, key, value);
  } catch {
    /* armazenamento bloqueado */
  }
}

/**
 * Ambiente da aba atual.
 * Prioridade:
 * 1. Subdomínio da marca (ex: veicular.primapay.com.br)
 * 2. URL atual (caminho ou query ?env=)
 * 3. sessionStorage desta aba específica (NUNCA localStorage global de outra aba!)
 */
export function getTabScope(): SessionScope | null {
  if (typeof window === "undefined") return null;

  // 1. Subdomínio da marca
  try {
    const fromHost = detectEnvironmentFromHostname();
    if (fromHost) return fromHost;
  } catch {
    /* ignore */
  }

  // 2. URL atual (pathname ou search)
  try {
    const fromUrl = scopeFromLocation(window.location.pathname, window.location.search);
    if (fromUrl) {
      writeRaw(window.sessionStorage, TAB_KEY, fromUrl);
      return fromUrl;
    }
  } catch {
    /* ignore */
  }

  // 3. sessionStorage exclusivo desta aba
  const tab = readRaw(window.sessionStorage, TAB_KEY);
  if (isScope(tab)) return tab;

  return null;
}

export function setTabScope(scope: SessionScope) {
  if (typeof window === "undefined") return;
  writeRaw(window.sessionStorage, TAB_KEY, scope);
}

export function clearTabScope() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TAB_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Instala a separação de login por aba. Precisa rodar antes do primeiro uso do
 * cliente de login (ele é criado sob demanda).
 */
export function installTabSessionScope() {
  if (typeof window === "undefined") return;
  const w = window as typeof window & { __primaTabScopeInstalled?: boolean };
  if (w.__primaTabScopeInstalled) return;
  w.__primaTabScopeInstalled = true;

  // Remove o login antigo compartilhado (de antes da separação por ambiente),
  // para que nenhuma aba sem ambiente herde a sessão de outra plataforma.
  try {
    const legacy: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && isAuthStorageKey(k) && !/::(ec|veicular|imobiliaria)$/.test(k)) legacy.push(k);
    }
    legacy.forEach((k) => window.localStorage.removeItem(k));
  } catch {
    /* armazenamento bloqueado */
  }

  const fromUrl = scopeFromLocation(window.location.pathname, window.location.search);
  if (fromUrl) setTabScope(fromUrl);

  const proto = Storage.prototype;
  const origGet = proto.getItem;
  const origSet = proto.setItem;
  const origRemove = proto.removeItem;
  rawGet = origGet;
  rawSet = origSet;

  const mapKey = (storage: Storage, key: string) => {
    if (storage !== window.localStorage || !isAuthStorageKey(String(key))) return key;
    const scope = getTabScope();
    return scopedAuthKey(String(key), scope);
  };

  proto.getItem = function (this: Storage, key: string) {
    return origGet.call(this, mapKey(this, key));
  };
  proto.setItem = function (this: Storage, key: string, value: string) {
    return origSet.call(this, mapKey(this, key), value);
  };
  proto.removeItem = function (this: Storage, key: string) {
    return origRemove.call(this, mapKey(this, key));
  };

  // O login avisa as outras abas por um canal com o nome da chave; separa por ambiente.
  const OrigChannel = window.BroadcastChannel;
  if (OrigChannel) {
    class ScopedChannel extends OrigChannel {
      constructor(name: string) {
        const isAuth = isAuthStorageKey(String(name));
        const scope = getTabScope();
        super(isAuth && scope ? scopedAuthKey(String(name), scope) : name);
      }
    }
    window.BroadcastChannel = ScopedChannel as typeof BroadcastChannel;
  }
}
