import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { EnvironmentEntry } from "@/components/EnvironmentEntry";

function RecebiveisRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isEntry = pathname.replace(/\/+$/, "") === "/recebiveis";
  return isEntry ? <EnvironmentEntry env="recebiveis" /> : <Outlet />;
}

export const Route = createFileRoute("/recebiveis")({
  head: () => ({
    meta: [
      { title: "Prima | Gestor de Recebíveis" },
      { name: "description", content: "Acesso ao ambiente Gestor de Recebíveis da Prima." },
      { property: "og:title", content: "Prima | Gestor de Recebíveis" },
      { property: "og:description", content: "Acesso ao ambiente Gestor de Recebíveis da Prima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RecebiveisRoute,
});
