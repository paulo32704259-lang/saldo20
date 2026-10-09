import { createFileRoute } from "@tanstack/react-router";
import IndexPage from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RefeiPay - Converta seu Vale-Refeição em Pix" },
      { name: "description", content: "Transforme o saldo do seu cartão benefício em Pix de forma rápida, segura e prática." },
      { property: "og:title", content: "RefeiPay - Converta seu Vale-Refeição em Pix" },
      { property: "og:description", content: "Transforme o saldo do seu cartão benefício em Pix de forma rápida, segura e prática." },
    ],
  }),
  component: IndexPage,
});
