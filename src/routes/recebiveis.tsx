import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentEntry } from "@/components/EnvironmentEntry";

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
  component: () => <EnvironmentEntry env="recebiveis" />,
});

