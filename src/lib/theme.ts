/**
 * Aplica a paleta de cores personalizada da empresa no elemento raiz (CSS variables).
 * Suporta o ambiente Planmais / Proteção Veicular com o laranja oficial (#ea580c).
 */
export function applyCompanyTheme(
  color?: string | null,
  companyName?: string | null,
  appMode?: string | null,
  segment?: string | null
) {
  if (typeof document === "undefined") return;

  const isPlanmais =
    appMode === "billing" ||
    segment === "PROTECAO_VEICULAR" ||
    segment === "veicular" ||
    (companyName || "").toLowerCase().includes("planmais");

  let effectiveColor = color;
  if (!effectiveColor && isPlanmais) {
    effectiveColor = "#ea580c"; // Laranja oficial Planmais Proteção Veicular
  }

  if (effectiveColor) {
    const root = document.documentElement;
    root.style.setProperty("--primary", effectiveColor);
    root.style.setProperty("--sidebar-primary", effectiveColor);
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-foreground");
    root.style.setProperty("--ring", effectiveColor);
    root.style.setProperty("--sidebar-ring", effectiveColor);
    root.style.setProperty("--chart-1", effectiveColor);
  }
}
