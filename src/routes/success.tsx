import { createFileRoute } from "@tanstack/react-router";
import SuccessPage from "@/pages/Success";

export const Route = createFileRoute("/success")({
  head: () => ({
    title: "Solicitação Processada - RefeiPay",
    meta: [
      { name: "description", content: "Sua solicitação de conversão foi enviada com sucesso." },
    ],
  }),
  component: SuccessPage,
});
