/**
 * Configuração e resolução de links independentes por ambiente
 * Permite que Hub, ECs, Proteção Veicular e Imobiliárias operem com links separados
 * e detecta dinamicamente a origem (window.location.origin) para sincronização Asaas.
 */

export const HUB_URL = "https://primahubserv.lovable.app";

export const DEFAULT_PLATFORM_URLS = {
  hub: HUB_URL,
  ec: "",
  veicular: "",
  imobiliaria: "",
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
  return HUB_URL;
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
 * Retorna a URL base de um determinado ambiente (apenas se houver configuração externa explícita)
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

  // 3. Padrão: mesma aplicação unificada
  return "";
}

/**
 * Retorna o link absoluto compartilhável para a plataforma
 */
export function getPlatformShareableUrl(platform: PlatformKey, path: string = ""): string {
  const customBase = getPlatformBaseUrl(platform);
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  if (customBase) {
    return `${customBase}${normalizedPath}`;
  }
  const origin = getCurrentOrigin();
  return `${origin}${normalizedPath}`;
}

/**
 * Resolve o link completo de acesso para um ambiente (login ou rota direta).
 * Como todas as plataformas rodam integradas no mesmo projeto Lovable,
 * a navegação padrão é interna (SPA), evitando erros 404 de subdomínios não criados.
 */
export function resolvePlatformUrl(platform: PlatformKey, path: string): string {
  const customBase = getPlatformBaseUrl(platform);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  // Se houver domínio externo explicitamente configurado que não seja os subdomínios antigos não criados
  if (customBase && !customBase.includes("primahubec") && !customBase.includes("primahubveicular") && !customBase.includes("primahubimob")) {
    return `${customBase}${normalizedPath}`;
  }

  // Retorna caminho relativo para navegação interna limpa
  return normalizedPath;
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
    base = getCurrentOrigin();
  }

  return `${base}/api/public/asaas-webhook?company_id=${companyId}`;
}
