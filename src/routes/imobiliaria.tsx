import { createFileRoute } from "@tanstack/react-router";
import { EnvironmentEntry } from "@/components/EnvironmentEntry";

export const Route = createFileRoute("/imobiliaria")({
  head: () => ({
    meta: [
      { title: "Prima | Gestão Imobiliária" },
      { name: "description", content: "Acesso ao ambiente de Gestão Imobiliária da Prima." },
      { property: "og:title", content: "Prima | Gestão Imobiliária" },
      { property: "og:description", content: "Acesso ao ambiente de Gestão Imobiliária da Prima." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <EnvironmentEntry env="imobiliaria" />,
});
