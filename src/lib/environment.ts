/**
 * Configuração e resolução de links independentes por ambiente.
 *
 * Cada ambiente (ECs, Proteção Veicular, Imobiliária) pode ter o próprio endereço
 * (ex.: veicular.primapay.com.br). Como o navegador guarda um login por endereço,
 * endereços próprios permitem ficar logado em dois ambientes ao mesmo tempo.
 */

export const HUB_URL = "https://primahubserv.lovable.app";

/** Domínio próprio da marca e o subdomínio de cada ambiente. */
export const BRAND_DOMAIN = "primapay.com.br";
export const PLATFORM_SUBDOMAINS = {
  ec: "ec",
  veicular: "veicular",
  imobiliaria: "imob",
} as const;

/**
 * Ligue (true) somente quando os três endereços próprios estiverem com status
 * "Active" em Configurações → Domínios. Enquanto estiver false, todos os ambientes
 * abrem no endereço principal (subdomínios inexistentes mostram "No Lovable project found").
 */
export const OWN_DOMAINS_ACTIVE = false;

export type PlatformKey = "hub" | "ec" | "veicular" | "imobiliaria";
type EnvKey = Exclude<PlatformKey, "hub">;

function ownDomainUrl(platform: EnvKey): string {
  return `https://${PLATFORM_SUBDOMAINS[platform]}.${BRAND_DOMAIN}`;
}

/** Endereços padrão de cada ambiente (usados em links e webhooks). */
export const DEFAULT_PLATFORM_URLS: Record<PlatformKey, string> = {
  hub: HUB_URL,
  ec: OWN_DOMAINS_ACTIVE ? ownDomainUrl("ec") : HUB_URL,
  veicular: OWN_DOMAINS_ACTIVE ? ownDomainUrl("veicular") : HUB_URL,
  imobiliaria: OWN_DOMAINS_ACTIVE ? ownDomainUrl("imobiliaria") : HUB_URL,
};

/** True quando o app está aberto em um endereço do domínio próprio. */
function isOnBrandDomain(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return host === BRAND_DOMAIN || host.endsWith(`.${BRAND_DOMAIN}`);
}

/**
 * Detecta o ambiente pelo primeiro trecho do endereço (ex.: "veicular" em
 * veicular.primapay.com.br). Endereços sem esse trecho retornam null.
 */
export function detectEnvironmentFromHostname(): EnvKey | null {
  if (typeof window === "undefined") return null;
  const label = window.location.hostname.toLowerCase().split(".")[0];
  const match = (Object.keys(PLATFORM_SUBDOMAINS) as EnvKey[]).find(
    (key) => PLATFORM_SUBDOMAINS[key] === label,
  );
  return match ?? null;
}

/** Retorna a origem atual no navegador de forma segura. */
export function getCurrentOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return HUB_URL;
}

/** Verifica se a execução está em ambiente local de desenvolvimento. */
export function isLocalEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
}

/**
 * Retorna a URL base de um ambiente quando ele tem endereço próprio; "" quando
 * o ambiente roda no mesmo endereço atual (navegação interna).
 */
export function getPlatformBaseUrl(platform: PlatformKey): string {
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem(`prima_env_url_${platform}`);
    if (custom?.trim()) return custom.trim().replace(/\/$/, "");
  }

  if (platform === "ec" && import.meta.env.VITE_EC_URL) return import.meta.env.VITE_EC_URL;
  if (platform === "veicular" && import.meta.env.VITE_VEICULAR_URL) return import.meta.env.VITE_VEICULAR_URL;
  if (platform === "imobiliaria" && import.meta.env.VITE_IMOBILIARIA_URL) return import.meta.env.VITE_IMOBILIARIA_URL;

  if (platform !== "hub" && (OWN_DOMAINS_ACTIVE || isOnBrandDomain())) {
    return ownDomainUrl(platform);
  }

  return "";
}

/** Retorna o link absoluto compartilhável para a plataforma. */
export function getPlatformShareableUrl(platform: PlatformKey, path: string = ""): string {
  const customBase = getPlatformBaseUrl(platform);
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  return `${customBase || getCurrentOrigin()}${normalizedPath}`;
}

/**
 * Resolve o link de acesso para um ambiente. Retorna um endereço completo quando
 * o ambiente tem endereço próprio diferente do atual; caso contrário, caminho interno.
 */
export function resolvePlatformUrl(platform: PlatformKey, path: string): string {
  const customBase = getPlatformBaseUrl(platform);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const isLegacyMissing =
    customBase.includes("primahubec") ||
    customBase.includes("primahubveicular") ||
    customBase.includes("primahubimob");

  if (customBase && !isLegacyMissing && customBase !== getCurrentOrigin()) {
    return `${customBase}${normalizedPath}`;
  }

  return normalizedPath;
}

/**
 * Retorna a URL de Webhook do Asaas baseada no domínio atual (window.location.origin)
 * ou em um domínio selecionado/customizado.
 */
export function getAsaasWebhookUrl(companyId?: string | null, customBaseUrl?: string): string {
  if (!companyId) return "";

  const base = customBaseUrl?.trim()
    ? customBaseUrl.trim().replace(/\/$/, "")
    : getCurrentOrigin();

  return `${base}/api/public/asaas-webhook?company_id=${companyId}`;
}
