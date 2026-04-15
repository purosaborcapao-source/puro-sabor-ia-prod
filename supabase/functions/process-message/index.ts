import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { ProcessMessageRequestSchema, type MessagePayload } from "./schema.ts";
import { parseClaudeResponse } from "./parsers.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export async function handleProcessMessage(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();

    // Validar payload
    const validatedData = ProcessMessageRequestSchema.parse(body);
    const { message_id, customer_id, phone, text } = validatedData;

    console.log("🔄 [process-message] Processando mensagem:", {
      message_id,
      phone,
      text: text.substring(0, 50) + "...",
    });

    // 1. Buscar customer e histórico de mensagens
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: customer, error: customerError } = await supabase
      .from("customers")
      .select("id, name, phone, points")
      .eq("id", customer_id)
      .single();

    if (customerError) {
      console.error("❌ Erro ao buscar customer:", customerError);
      throw customerError;
    }

    console.log("✅ Customer carregado:", customer.name);

    // 2. Buscar últimas 5 mensagens para contexto
    const { data: recentMessages, error: messagesError } = await supabase
      .from("messages")
      .select("direction, content")
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (messagesError) {
      console.error("⚠️  Erro ao buscar mensagens anteriores:", messagesError);
    }

    // 3. Buscar catálago de produtos ativos
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, name, price, category")
      .eq("is_active", true);

    if (productsError) {
      console.error("⚠️  Erro ao buscar produtos:", productsError);
    }

    const catalogText = products
      ?.map((p) => `- ${p.name} (${p.category}): R$ ${p.price}`)
      .join("\n") || "Catálogo não disponível temporariamente.";

    // 4. Buscar settings (ai_prompt customizado)
    const { data: settings } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "ai_prompt")
      .single();

    let basePrompt = `Você é o Assistente Especialista da Puro Sabor, uma confeiteira premium.
Sua missão é atender clientes via WhatsApp com extrema cordialidade e eficiência.

DIRETRIZES DE ESTILO:
- Use emojis de confeitaria ocasionalmente (🍰, 🧁, 🍪, ✨).
- Seja breve, mas acolhedor.
- Não invente produtos que não estão no catálogo.

DADOS DA EMPRESA:
- Nome: Puro Sabor IA
- Horário: Seg-Sáb, 09h às 19h.

CATÁLOGO REAL DE PRODUTOS:
${catalogText}

REGRAS DE EXTRAÇÃO:
- Identifique a intenção do cliente.
- Extraia itens do pedido como um array de objetos.
- Identifique a data solicitada (se mencionada).
- NÃO envie a mensagem para o cliente agora, você está gerando uma SUGESTÃO para o atendente humano.`;

    const aiPrompt = settings?.value ? String(settings.value) : basePrompt;

    // 5. Mapeamento Direto (Zero-AI) vs Claude API
    const isWebAppOrder = text.includes("📄 Resumo dos Itens:");
    let parsed: any;

    if (isWebAppOrder) {
      console.log("🛒 [process-message] Detectado pedido do Web App! Processamento Zero-AI.");

      // Extrair data: "📅 Data: DD/MM/YYYY"
      const dateMatch = text.match(/📅\s*Data:\s*(\d{2}\/\d{2}\/\d{4})/);
      // Extrair horário: "🕐 Horário: HH:MM"
      const timeMatch = text.match(/🕐\s*Horário:\s*(\d{2}:\d{2})/);

      // Extrair observações do pedido
      const obsMatch = text.match(/📝\s*Observações:\s*(.+)/);
      const observation = obsMatch ? obsMatch[1].trim() : null;

      // Extrair total: "💰 Valor Total do Pedido: R$ XXX,XX"
      const totalMatch = text.match(/💰\s*Valor Total do Pedido:\s*R\$\s*([\d.,]+)/);
      let orderTotal = 0;
      if (totalMatch) {
         orderTotal = parseFloat(totalMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair sinal (opcional, para contexto)
      const sinalMatch = text.match(/🔸\s*Sinal Sugerido:\s*R\$\s*([\d.,]+)/);

      const productLines = text.split('\n').filter(l => l.trim().startsWith('•'));
      const items = productLines.map(line => {
        let qtyStr = "1";
        const matchQty = line.match(/•\s*([\d.,]+)(x|g|kg)?/);
        if (matchQty) {
          qtyStr = matchQty[1].replace(',', '.');
        }
        let quantity = parseFloat(qtyStr) || 1;

        const cleanLine = line.toLowerCase();

        // Extrair preço do item: "• XXx Nome (R$ XXX,XX)"
        const priceMatch = line.match(/\(R\$\s*([\d.,]+)\)/);
        let itemPrice = 0;
        if (priceMatch) {
          itemPrice = parseFloat(priceMatch[1].replace(/\./g, '').replace(',', '.'));
        }

        // Tentar encontrar por ID curto primeiro [#abcd1234]
        const shortIdMatch = line.match(/\[#([a-f0-9]{8})\]/);
        let matchedProduct = null;

        if (shortIdMatch) {
          const shortId = shortIdMatch[1];
          matchedProduct = products?.find(p => p.id.startsWith(shortId));
        }

        // Fallback por nome (remover quantidade e preço para buscar)
        if (!matchedProduct) {
          const nameOnly = line.replace(/•\s*[\d.,]+(x|g|kg)?\s*/g, '').replace(/\(R\$\s*[\d.,]+\)/g, '').replace(/\[#([a-f0-9]{8})\]/g, '').trim();
          matchedProduct = products?.find(p => nameOnly.toLowerCase().includes(p.name.toLowerCase().trim()));
        }

        const customText = line.match(/•\s*\d+(x|g|kg)?\s+.*?(?:\s*•\s*)(.+?)(?:\s*\(R\$|$)/)?.[1] || '';
        
        return {
          product_id: matchedProduct?.id,
          product: matchedProduct?.name || line.replace(/•\s*[\d.,]+(x|g|kg)?\s*/g, '').replace(/\(R\$\s*[\d.,]+\)/g, '').replace(/\[#([a-f0-9]{8})\]/g, '').trim(),
          quantity: quantity,
          price: matchedProduct?.price || itemPrice || 0,
          observation: customText || line.replace(/\[#([a-f0-9]{8})\]/g, '').trim()
        };
      });

      // If total was not found via regex, calculate from matched prices
      if (orderTotal === 0 && items.length > 0) {
         orderTotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      }

      // Converter data de DD/MM/YYYY para YYYY-MM-DD
      let deliveryDate = null;
      if (dateMatch) {
        const [day, month, year] = dateMatch[1].split('/');
        deliveryDate = `${year}-${month}-${day}`;
      }

      parsed = {
        intent: "NEW_ORDER",
        confidence: 1.0,
        extracted_data: {
          items,
          total: orderTotal,
          delivery_date: deliveryDate,
          delivery_time: timeMatch ? timeMatch[1] : null,
          observation: observation
        },
        suggested_response: "Recebemos seu pedido pelo catálogo Web! Nossa equipe já está revisando as informações e confirmará em breve.",
        should_escalate: true
      };

      console.log("✅ Resposta processada estruturalmente:", { itemsFound: items.length, total: orderTotal, date: deliveryDate, time: timeMatch ? timeMatch[1] : null });
    } else {
      console.log("🔄 [process-message] Chamando Claude API...");

      const claudeResponse = await callClaudeAPI(
        aiPrompt,
        text,
        customer.name,
        recentMessages || []
      );

      parsed = parseClaudeResponse(claudeResponse, "GENERAL_CHAT");

      console.log("✅ Resposta processada pela IA:", {
        intent: parsed.intent,
        confidence: parsed.confidence,
        itemsFound: (parsed.extracted_data?.items as any[])?.length || 0,
      });
    }

    // 7. Atualizar message com payload processado
    const messagePayload: MessagePayload = {
      intent: parsed.intent,
      confidence: parsed.confidence,
      extracted_data: parsed.extracted_data as Record<string, unknown>,
      suggested_response: parsed.suggested_response,
      should_escalate: parsed.should_escalate,
      raw_text: text,
    };

    const { error: updateError } = await supabase
      .from("messages")
      .update({
        payload: messagePayload,
      })
      .eq("id", message_id);

    if (updateError) {
      console.error("❌ Erro ao atualizar message:", updateError);
    }

    // 8. Se for NEW_ORDER, criar rascunho de pedido
    if (parsed.intent === "NEW_ORDER" && parsed.confidence > 0.8) {
      console.log("🚀 [process-message] Criando rascunho de pedido...");
      // For web app orders, mark as PENDENTE (requires manual approval of the draft still? No wait, if matched all IDs, it could be PENDENTE. We keep it as RASCUNHO_IA so they review).
      await createDraftOrder(supabase, customer_id, parsed.extracted_data);

      // Atualizar status da conversa para WAITING_ORDER para aparecer no Kanban
      await supabase
        .from('conversations')
        .update({ status: 'WAITING_ORDER' })
        .eq('customer_id', customer_id)
        .catch((err) => console.warn("⚠️ Erro ao atualizar status conversa:", err));
    }

    // Gatilhos de notificação desativados conforme solicitação (IA Passiva)
    console.log("ℹ️ [process-message] Modo Passivo ativado. Nenhuma resposta automática enviada.");

    return new Response(
      JSON.stringify({
        success: true,
        message_id,
        intent: parsed.intent,
        response: parsed.suggested_response,
        escalate: parsed.should_escalate,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Validação falhou:", error.errors);
      return new Response(
        JSON.stringify({
          error: "Invalid payload",
          details: error.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("❌ Erro em process-message:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function callClaudeAPI(
  systemPrompt: string,
  userMessage: string,
  customerName: string,
  recentMessages: any[]
): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    console.warn("⚠️  ANTHROPIC_API_KEY não configurada, usando fallback");
    return JSON.stringify({
      intent: "GENERAL_CHAT",
      response: `Olá ${customerName}! Como posso ajudá-lo?`,
      extracted_data: {},
      escalate: false,
    });
  }

  // Construir contexto com mensagens anteriores
  const messageHistory = recentMessages
    .map(
      (msg) =>
        `${msg.direction === "INBOUND" ? "Cliente" : "Bot"}: ${msg.content}`
    )
    .join("\n");

  const fullPrompt = `Você deve analisar a mensagem do cliente e o histórico (se houver) para extrair as intenções e dados de pedido.

${messageHistory ? `Histórico recente:\n${messageHistory}\n\n` : ""}Cliente (${customerName}): ${userMessage}

Retorne OBRIGATORIAMENTE um JSON no formato abaixo:
{
  "intent": "NEW_ORDER|ORDER_INQUIRY|ORDER_TRACKING|CANCEL_ORDER|COMPLAINT|FEEDBACK|GENERAL_CHAT|OTHER",
  "confidence": 0.95,
  "extracted_data": {
    "items": [
      { "product": "Nome do Produto", "quantity": 1, "observation": "ex: sem açúcar" }
    ],
    "delivery_date": "YYYY-MM-DD (se mencionada)",
    "delivery_time": "HH:MM (se mencionada)"
  },
  "response": "Sua resposta amigável aqui, confirmando o que entendeu e pedindo o que falta.",
  "escalate": false
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userMessage,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("❌ Erro Claude API:", error);
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    const claudeText = data.content[0].text;

    console.log("✅ Claude respondeu:", claudeText.substring(0, 100) + "...");

    return claudeText;
  } catch (error) {
    console.error("❌ Erro ao chamar Claude API:", error);
    throw error;
  }
}

async function createDraftOrder(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  extractedData: any
): Promise<void> {
  try {
    const orderNumber = `IA-${Date.now().toString().slice(-6)}`;
    
const orderNotes = extractedData?.delivery_time 
        ? `Horário de Retirada/Entrega: ${extractedData.delivery_time}`
        : '';
    
    const observation = extractedData?.observation || '';
    const fullNotes = [orderNotes, observation].filter(Boolean).join('\n') + '\nCriado via Catálogo Web.';

    // 1. Criar o pedido
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        number: orderNumber,
        customer_id: customerId,
        delivery_date: extractedData?.delivery_date ? convertToDbDate(extractedData.delivery_date) : null,
        delivery_type: "RETIRADA",
        status: "PENDENTE",
        payment_status: "SINAL_PENDENTE",
        ai_processed: true,
        sinal_confirmado: false,
        notes: fullNotes,
        total: extractedData?.total || 0, 
      })
      .select()
      .single();

    if (orderError) throw orderError;

    console.log(`✅ Rascunho de pedido criado: ${order.number}`);

    // 2. Criar os order_items se viermos com IDs e calcular Total
    console.log("📦 Itens recebidos:", JSON.stringify(extractedData?.items));
    
    if (extractedData?.items && Array.isArray(extractedData.items)) {
      const orderItems = [];
      console.log(`🔍 Processando ${extractedData.items.length} itens`);
      
      for (const item of extractedData.items) {
         console.log("📦 Item:", JSON.stringify(item));
         
         if (item.product_id) {
           orderItems.push({
             order_id: order.id,
             product_id: item.product_id,
             quantity: item.quantity || 1,
             unit_price: item.price || 0,
             customizations: { notes: item.observation }
           });
         } else {
             console.warn(`⚠️ produto_id não encontrado no item: ${JSON.stringify(item)}`);
         }
      }
      console.log("📦 orderItems a inserir:", JSON.stringify(orderItems));
      
      if (orderItems.length > 0) {
        const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
        if (itemsError) {
          console.error("❌ Erro ao criar order_items:", itemsError);
        } else {
          console.log(`✅ ${orderItems.length} order_items associados.`);
        }
      }
    }
  } catch (err) {
    console.error("❌ Erro ao criar rascunho de pedido:", err);
  }
}

function convertToDbDate(dateStr: string) {
  // Try to convert DD/MM/YYYY to YYYY-MM-DD
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
}

async function triggerNotification(
  supabase: ReturnType<typeof createClient>,
  messageId: string,
  customerId: string,
  payload: any
): Promise<void> {
  // Inserir em uma fila de notificações para send-notifications processar
  const { error } = await supabase
    .from("messages")
    .update({
      zapi_status: "PENDING",
    })
    .eq("id", messageId);

  if (error) {
    console.error("⚠️  Erro ao marcar para notificação:", error);
  }

  console.log("📬 Mensagem marcada para notificação");
}

Deno.serve(handleProcessMessage);
