import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Anthropic } from "https://esm.sh/@anthropic-ai/sdk@0.18.0";

const anthropic = new Anthropic({
  apiKey: Deno.env.get("ANTHROPIC_API_KEY") || "",
});

export async function handleAnalyzeChat(request: Request): Promise<Response> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { customer_id } = await request.json();

    if (!customer_id) throw new Error("customer_id is required");

    // 1. Buscar Checkout/Dados do Cliente
    const { data: customer, error: custErr } = await supabase
      .from("customers")
      .select("id, name, phone, last_ai_analysis_at")
      .eq("id", customer_id)
      .single();

    if (custErr) throw custErr;

    // 2. Buscar mensagens desde o último checkpoint
    const lastAnalysis = customer.last_ai_analysis_at || new Date(0).toISOString();
    const { data: messages, error: msgErr } = await supabase
      .from("messages")
      .select("direction, content, created_at")
      .eq("customer_id", customer_id)
      .gt("created_at", lastAnalysis)
      .order("created_at", { ascending: true });

    if (msgErr) throw msgErr;

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Sem novas mensagens para analisar." }));
    }

    // 3. Preparar contexto para o Claude
    const chatContext = messages
      .map((m) => `${m.direction === "INCOMING" ? "CLIENTE" : "ATENDENTE"}: ${m.content}`)
      .join("\n");

    // 4. Buscar pedidos ativos do cliente para identificar se é uma alteração
    const { data: activeOrders } = await supabase
      .from("orders")
      .select("id, number, status, total")
      .eq("customer_id", customer_id)
      .neq("status", "CANCELADO")
      .neq("status", "ENTREGUE");

    // 5. Chamada Claude
    const prompt = `Você é um assistente de gestão de pedidos da confeitaria Puro Sabor.
Analise a conversa abaixo entre um cliente e a operadora.

CONTEXTO DOS PEDIDOS ATIVOS:
${JSON.stringify(activeOrders || [])}

CONVERSA:
${chatContext}

SUA TAREFA:
1. Identifique se o cliente está querendo fazer um NOVO PEDIDO ou ALTERAR um pedido ativo.
2. Identifique produtos, quantidades, data e hora de entrega mencionados.
3. Se for uma ALTERAÇÃO, identifique qual campo mudou e sugira o NOVO VALOR TOTAL baseado no preço anterior.

REGRAS DE VALORES (ESTIMATIVA):
- Bolo 1kg: R$ 45
- Bolo 2kg: R$ 75
- Torta: R$ 120

Responda APENAS em JSON no seguinte formato:
{
  "type": "NEW_ORDER" | "UPDATE_ORDER" | "GENERAL",
  "confidence": 0-1,
  "order_id": "id do pedido se for alteração",
  "data": {
    "items": [],
    "delivery_date": "YYYY-MM-DD",
    "delivery_time": "HH:MM",
    "suggested_total": 0,
    "change_reason": "Motivo da alteração"
  },
  "summary": "Breve resumo do que foi detectado"
}`;

    const completion = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const aiResponse = completion.content[0].text;
    const result = JSON.parse(aiResponse);

    // 6. Executar ações baseadas no resultado
    if (result.type === "NEW_ORDER" && result.confidence > 0.7) {
      // Criar Rascunho de Pedido
      await supabase.from("orders").insert({
        customer_id,
        number: `IA-${Date.now().toString().slice(-6)}`,
        delivery_date: result.data.delivery_date,
        status: "RASCUNHO_IA",
        total: result.data.suggested_total,
        notes: `AI Summary: ${result.summary}`
      });
    } else if (result.type === "UPDATE_ORDER" && result.order_id) {
      // Registrar Sugestão de Alteração
      await supabase.from("order_changes").insert({
        order_id: result.order_id,
        changed_by: "00000000-0000-0000-0000-000000000000", // Fixado como BOT/System se houver ID
        field: "MULTIPLE",
        old_value: "Ver pedido",
        new_value: JSON.stringify(result.data),
        reason: result.summary,
        is_ai_suggestion: true,
        status: "PENDENTE",
        suggestion_data: result.data
      });
    }

    // 7. Atualizar Checkpoint
    await supabase
      .from("customers")
      .update({ last_ai_analysis_at: messages[messages.length - 1].created_at })
      .eq("id", customer_id);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("❌ Erro no analyze-chat:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

Deno.serve(handleAnalyzeChat);
