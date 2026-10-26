import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentEntry } from "@/components/EnvironmentEntry";

export const Route = createFileRoute("/veicular/")({
  head: () => ({
    meta: [
      { title: "Prima | Proteção Veicular" },
      { name: "description", content: "Acesso ao ambiente de Proteção Veicular da Prima." },
      { property: "og:title", content: "Prima | Proteção Veicular" },
      { property: "og:description", content: "Acesso ao ambiente de Proteção Veicular da Prima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <EnvironmentEntry env="veicular" />,
});
