import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentEntry } from "@/components/EnvironmentEntry";

export const Route = createFileRoute("/ec")({
  head: () => ({
    meta: [
      { title: "Prima | Estabelecimentos Comerciais" },
      { name: "description", content: "Acesso ao ambiente de Estabelecimentos Comerciais da Prima." },
      { property: "og:title", content: "Prima | Estabelecimentos Comerciais" },
      { property: "og:description", content: "Acesso ao ambiente de Estabelecimentos Comerciais da Prima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <EnvironmentEntry env="ec" />,
});
