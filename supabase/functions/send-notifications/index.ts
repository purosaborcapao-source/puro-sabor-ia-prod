import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

interface NotificationTask {
  type: "RESPONSE" | "REMINDER" | "CONFIRMATION" | "FEEDBACK" | "PROMOTION";
  message_id?: string;
  customer_id: string;
  phone: string;
  content: string;
  delay_minutes?: number; // Se > 0, agendar para depois
}

export async function handleSendNotifications(request: Request): Promise<Response> {
  // Suporta GET (para cron) ou POST (para teste)
  if (!["GET", "POST"].includes(request.method)) {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    console.log("🔄 [send-notifications] Iniciando processamento de notificações");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    /* 
    // MODO PASSIVO: Processamento de mensagens desativado
    // 1. Buscar mensagens pendentes de resposta
    const { data: pendingMessages, error: pendingError } = await supabase
      .from("messages")
      .select("id, customer_id, phone, payload, direction, created_at, customers(name)")
      .eq("direction", "INCOMING")
      .eq("zapi_status", "PENDING")
      .gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Últimas 60 min

    if (pendingError) {
      console.error("❌ Erro ao buscar mensagens:", pendingError);
      throw pendingError;
    }

    console.log(`📬 Encontradas ${pendingMessages?.length || 0} mensagens pendentes`);

    // 2. Processar cada mensagem
    if (pendingMessages && pendingMessages.length > 0) {
      for (const msg of pendingMessages) {
        // ... (lógica desativada)
      }
    }
    */

    // 3. Verificar delivery reminders (CUIDADO: Isso também pode ser considerado interação direta)
    // Se o usuário quer zero interação, desativamos isso também.
    // await processDeliveryReminders(supabase);

    return new Response(
      JSON.stringify({
        success: true,
        processed: pendingMessages?.length || 0,
        sent: successCount,
        errors: errorCount,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Erro em send-notifications:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function sendNotification(task: NotificationTask): Promise<void> {
  // Por enquanto, apenas logar (é mockado)
  // Quando Z-API estiver disponível, descomente:
  /*
  const zapiToken = Deno.env.get('ZAPI_TOKEN');
  if (!zapiToken) {
    console.warn('⚠️  ZAPI_TOKEN não configurada');
    return;
  }

  const response = await fetch('https://api.z-api.io/instances/YOUR_INSTANCE/token/YOUR_TOKEN/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: task.phone,
      message: task.content,
    })
  });

  if (!response.ok) {
    throw new Error(`Z-API error: ${response.statusText}`);
  }
  */

  console.log(
    `📤 [MOCK] Enviando para ${task.phone}: ${task.content.substring(0, 50)}...`
  );
}

function generateResponseFromIntent(
  intent: string | undefined,
  customerName: string
): string {
  const responses: Record<string, string> = {
    NEW_ORDER: `Oi ${customerName}! 😊 Adorei seu interesse! Para confirmar seu pedido, preciso saber:
1. Qual produto você quer?
2. Que data/hora você gostaria?
3. Quanto você vai querer?

Manda aí!`,

    ORDER_INQUIRY: `Oi ${customerName}! Nossas delícias têm preços super acessíveis:
- Bolo 1kg: R$45
- Bolo 2kg: R$75
- Torta: R$120
- Brigadeiros (dúzia): R$40

Quer fazer um pedido? 🎂`,

    ORDER_TRACKING: `Oi ${customerName}! Vou checar o status do seu pedido. Um momento...
(Nosso gerente logo entra em contato com você!)`,

    CANCEL_ORDER: `${customerName}, recebi seu pedido de cancelamento. Deixa eu verificar aqui...
Nosso gerente vai entrar em contato em breve!`,

    COMPLAINT: `${customerName}, desculpa muito ouvir isso! 😔
Vamos resolver isso agora mesmo. Nosso gerente vai entrar em contato com você em breve.`,

    FEEDBACK: `${customerName}, muito obrigado pelo feedback! 🙏
Suas palavras nos motivam a melhorar cada vez mais!`,

    GENERAL_CHAT: `Oi ${customerName}! Como posso te ajudar? 😊`,

    OTHER: `${customerName}, entendi sua mensagem! Como posso ajudá-lo?`,
  };

  return responses[intent || "GENERAL_CHAT"];
}

async function processDeliveryReminders(
  supabase: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.38.0").createClient>
): Promise<void> {
  // Buscar pedidos com entrega amanhã que ainda não enviaram lembrete
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, customer_id, customers(phone, name), delivery_date")
    .eq("delivery_date", tomorrowStr)
    .eq("status", "CONFIRMADO")
    .not("sent_reminder_24h", "is", true);

  if (error) {
    console.error("⚠️  Erro ao buscar pedidos para reminder:", error);
    return;
  }

  console.log(`📅 Encontrados ${orders?.length || 0} pedidos para reminder`);

  if (orders && orders.length > 0) {
    for (const order of orders) {
      const customer = order.customers as any;
      const reminderText = `${customer.name}, só uma lembrança: seu pedido está pronto para entrega/retirada amanhã! 🎂`;

      await sendNotification({
        type: "REMINDER",
        customer_id: order.customer_id,
        phone: customer.phone,
        content: reminderText,
      });

      // Marcar como enviado
      await supabase
        .from("orders")
        .update({ sent_reminder_24h: true })
        .eq("id", order.id);

      console.log(`✅ Reminder enviado para ${customer.name}`);
    }
  }
}

Deno.serve(handleSendNotifications);
