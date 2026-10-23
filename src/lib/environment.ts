/**
 * Configuração e resolução de links independentes por ambiente
 * Permite que Hub, ECs, Proteção Veicular e Imobiliárias operem com links separados
 * e detecta dinamicamente a origem (window.location.origin) para sincronização Asaas.
 */

export const HUB_URL = "https://primahubserv.lovable.app";

// Todos os ambientes são servidos pelo mesmo app publicado; o ambiente é
// definido pelo parâmetro ?env= no login e pelo segmento da empresa do usuário.
// Para usar domínios separados, conecte domínios próprios e sobrescreva via VITE_*_URL.
export const DEFAULT_PLATFORM_URLS = {
  hub: HUB_URL,
  ec: HUB_URL,
  veicular: HUB_URL,
  imobiliaria: HUB_URL,
} as const;

export type PlatformKey = keyof typeof DEFAULT_PLATFORM_URLS;

/**
 * Detecta o ambiente a partir do subdomínio ou hostname atual
 */
export function detectEnvironmentFromHostname(): "ec" | "veicular" | "imobiliaria" | null {
  if (typeof window === "undefined") return null;
  const host = window.location.hostname.toLowerCase();
  if (host.includes("veicular")) return "veicular";
  if (host.includes("imob")) return "imobiliaria";
  if (host.includes("ec")) return "ec";
  return null;
}

/**
 * Retorna a origem atual no navegador de forma segura
 */
export function getCurrentOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

/**
 * Verifica se a execução está em ambiente local de desenvolvimento
 */
export function isLocalEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local");
}

/**
 * Retorna a URL base de um determinado ambiente
 */
export function getPlatformBaseUrl(platform: PlatformKey): string {
  // 1. Verificação de override salvo no navegador
  if (typeof window !== "undefined") {
    const custom = localStorage.getItem(`prima_env_url_${platform}`);
    if (custom?.trim()) return custom.trim().replace(/\/$/, "");
  }

  // 2. Variáveis de ambiente Vite
  if (platform === "ec" && import.meta.env.VITE_EC_URL) return import.meta.env.VITE_EC_URL;
  if (platform === "veicular" && import.meta.env.VITE_VEICULAR_URL) return import.meta.env.VITE_VEICULAR_URL;
  if (platform === "imobiliaria" && import.meta.env.VITE_IMOBILIARIA_URL) return import.meta.env.VITE_IMOBILIARIA_URL;

  // 3. URLs padrão separadas por ambiente
  return DEFAULT_PLATFORM_URLS[platform];
}

/**
 * Resolve o link completo de acesso para um ambiente (login ou rota direta)
 */
export function resolvePlatformUrl(platform: PlatformKey, path: string): string {
  // Em localhost mantemos a navegação local interna para permitir testes
  if (isLocalEnvironment()) {
    return path;
  }

  const base = getPlatformBaseUrl(platform);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  // Mesmo domínio do site atual: navegação interna
  if (base === getCurrentOrigin()) return normalizedPath;
  return `${base}${normalizedPath}`;
}

/**
 * Retorna a URL de Webhook do Asaas baseada no domínio atual (window.location.origin)
 * ou em um domínio selecionado/customizado.
 */
export function getAsaasWebhookUrl(companyId?: string | null, customBaseUrl?: string): string {
  if (!companyId) return "";

  let base = "";
  if (customBaseUrl?.trim()) {
    base = customBaseUrl.trim().replace(/\/$/, "");
  } else {
    const origin = getCurrentOrigin();
    base = origin || DEFAULT_PLATFORM_URLS.ec;
  }

  return `${base}/api/public/asaas-webhook?company_id=${companyId}`;
}
