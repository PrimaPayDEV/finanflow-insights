/**
 * Login independente por ambiente no mesmo endereço.
 *
 * O navegador guarda um único login por endereço. Para permitir ficar logado em
 * dois ambientes ao mesmo tempo (ex.: PrimaPay numa aba e PlanMais em outra), cada
 * aba recebe um "ambiente da aba" e o login é guardado numa gaveta separada por ambiente.
 *
 * Os sub-links /ec, /veicular e /imobiliaria definem o ambiente da aba.
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
const LAST_KEY = "prima_last_env";
const AUTH_KEY_RE = /^sb-[a-z0-9_-]+-auth-token(-code-verifier)?$/i;

function isScope(value: unknown): value is SessionScope {
  return typeof value === "string" && (SESSION_SCOPES as string[]).includes(value);
}

/** Ambiente indicado pelo endereço aberto (sub-link ou /login?env=...). */
export function scopeFromLocation(pathname: string, search: string): SessionScope | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  const entry = SESSION_SCOPES.find((s) => ENTRY_PATHS[s] === path);
  if (entry) return entry;
  if (search) {
    try {
      const env = new URLSearchParams(search).get("env");
      if (isScope(env)) return env;
    } catch {
      /* ignore */
    }
  }
  return null;
}

/** True para as chaves em que o login fica guardado no navegador. */
export function isAuthStorageKey(key: string): boolean {
  return AUTH_KEY_RE.test(key);
}

/** Nome da gaveta de login de um ambiente. Sem ambiente, usa a gaveta original. */
export function scopedAuthKey(key: string, scope: SessionScope | null): string {
  return scope ? `${key}::${scope}` : key;
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

/** Ambiente da aba atual (ou o último usado, para abas novas). */
export function getTabScope(): SessionScope | null {
  if (typeof window === "undefined") return null;
  const tab = readRaw(window.sessionStorage, TAB_KEY);
  if (isScope(tab)) return tab;
  const last = readRaw(window.localStorage, LAST_KEY);
  return isScope(last) ? last : null;
}

export function setTabScope(scope: SessionScope) {
  if (typeof window === "undefined") return;
  writeRaw(window.sessionStorage, TAB_KEY, scope);
  writeRaw(window.localStorage, LAST_KEY, scope);
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

  // Dentro do editor do Lovable a prévia compartilha um único login; não mexe.
  if (window.parent !== window) return;

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
    return scopedAuthKey(String(key), getTabScope());
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
        super(isAuthStorageKey(String(name)) ? scopedAuthKey(String(name), getTabScope()) : name);
      }
    }
    window.BroadcastChannel = ScopedChannel as typeof BroadcastChannel;
  }
}
