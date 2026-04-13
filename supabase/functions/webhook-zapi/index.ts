import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { ZapiWebhookSchema, extractMessageContent } from "./schema.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ─── Geração de hash simples para content dedup ────────────────────────────
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Converte para 32bit int
  }
  return Math.abs(hash).toString(36);
}

// Fallback external_id quando Z-API não envia messageId
// Usa phone + conteúdo + timestamp arredondado a 10s (tolerância de reentrega)
function buildFallbackExternalId(phone: string, content: string, momment?: number): string {
  const ts = momment ? Math.floor(momment / 10000) : Math.floor(Date.now() / 10000);
  return `fallback:${simpleHash(`${phone}:${content}:${ts}`)}`;
}

// Normaliza telefone para formato consistente (só dígitos); preserva IDs especiais (@lid, etc)
function normalizePhone(phone: string): string {
  // Remove sufixos de chat do WhatsApp (ex: @c.us, @s.whatsapp.net) para unificar a identidade
  const clean = phone.split("@")[0];
  // Preserva IDs especiais modernos (@lid) que não são números puros
  if (phone.includes("@lid")) return phone;
  // Para números normais, remove tudo que não for dígito
  return clean.replace(/\D/g, "");
}

export async function handleZapiWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();

    // Validate with real Z-API schema
    const parsed = ZapiWebhookSchema.parse(body);

    // Extrair conteúdo primeiro - se não houver conteúdo, ignorar
    const { content, type, media_url } = extractMessageContent(parsed);
    if (!content || content === "[Mensagem não suportada]") {
      console.log(`ℹ️ [webhook-zapi] Payload sem conteúdo reconhecível, ignorando:`, JSON.stringify(body).slice(0, 200));
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "no_content" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Normalizar telefone para formato consistente (só dígitos)
    const normalizedPhone = normalizePhone(parsed.phone);
    
    // Filtrar grupos e listas de broadcast
    if (parsed.phone.includes("@g.us") || parsed.phone.includes("@broadcast")) {
      console.log(`ℹ️ [webhook-zapi] Ignorando mensagem de grupo/lista: ${parsed.phone}`);
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "group_or_list_ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const direction = parsed.fromMe ? "OUTBOUND" : "INBOUND";

    // ─── Camada 1: Construir external_id robusto ───────────────────────────
    // Usa messageId real da Z-API quando disponível; caso contrário, gera fallback
    // por hash de conteúdo para proteger contra reentregas sem messageId.
    const externalId = parsed.messageId
      ? `zapi:${parsed.messageId}`
      : buildFallbackExternalId(parsed.phone, content, parsed.momment);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Camada 2: Early check — ANTES de qualquer processamento ──────────
    // Evita findOrCreateCustomer, process-message e toda a lógica downstream
    // para mensagens que já foram processadas.
    const { data: existingMessage } = await supabase
      .from("messages")
      .select("id")
      .eq("external_id", externalId)
      .maybeSingle();

    if (existingMessage) {
      console.log(`⚡ [webhook-zapi] Duplicata detectada (early check): ${externalId}`);
      return new Response(
        JSON.stringify({ success: true, status: "already_processed", message_id: existingMessage.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─── Camada 3: Content dedup — mesma mensagem nos últimos 30 segundos ──
    // Protege contra retry interno da Z-API que gera um messageId diferente
    // para exatamente o mesmo conteúdo (ex: falha e reenvio automático).
    const contentHash = simpleHash(`${normalizedPhone}:${content}:${type}`);
    const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
    const messageType = type.toUpperCase() as "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VIDEO";

    const { data: contentDuplicate } = await supabase
      .from("messages")
      .select("id")
      .eq("phone", normalizedPhone)
      .eq("direction", direction)
      .eq("type", messageType)
      .eq("content", content)
      .gte("created_at", thirtySecondsAgo)
      .limit(1)
      .maybeSingle();

    if (contentDuplicate) {
      console.log(`⚡ [webhook-zapi] Duplicata de conteúdo (últimos 30s): ${contentHash}`);
      return new Response(
        JSON.stringify({ success: true, status: "duplicate_content", existing_message_id: contentDuplicate.id }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

// ─── Processamento normal a partir daqui ─────────────────────────────
    console.log("🔄 [webhook-zapi] Mensagem nova:", {
      phone: normalizedPhone,
      type,
      externalId,
      content: content.substring(0, 60),
    });

    // 1. Find or create customer
    // Se for OUTBOUND (aparelho), não criamos novo customer/lead. Apenas vinculamos se já existir.
    const customer = await findOrCreateCustomer(
      supabase, 
      normalizedPhone, 
      parsed.senderName || parsed.chatName,
      false // Permitir criação de cliente mesmo em mensagens OUTBOUND para garantir vinculação
    );

    if (!customer) {
      console.log(`ℹ️ [webhook-zapi] Customer não encontrado para mensagem OUTBOUND: ${normalizedPhone}. Ignorando.`);
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: "outbound_customer_not_found" }),
        { status: 200, headers: { "Content-Type": "application/json" },
      });
    }

    // 2. Inserir mensagem simples (sem upsert para evitar erros de schema)
    const insertData = {
      external_id: externalId,
      customer_id: customer.id,
      phone: normalizedPhone,
      direction,
      type: messageType,
      content,
      media_url,
      payload: {
        raw_text: content,
        zapi_message_id: parsed.messageId,
        sender_name: parsed.senderName,
        fromMe: parsed.fromMe,
      },
      zapi_status: "DELIVERED" as const,
    };
    
    console.log("💾 [webhook-zapi] Inserindo:", JSON.stringify(insertData).slice(0, 200));
    const { data: insertedMsg, error: messageError } = await supabase.from("messages").insert(insertData).select().single();

    if (messageError) {
      console.error("❌ [webhook-zapi] Erro ao inserir mensagem:", messageError);
      throw messageError;
    }

    if (!insertedMsg) {
      console.log(`⚡ [webhook-zapi] Falha ao obter resultado: ${externalId}`);
      return new Response(
        JSON.stringify({ success: false, status: "insert_failed" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Disparar processamento de IA apenas para mensagens INBOUND de texto genuinamente novas
    if (type === "text" && direction === "INBOUND" && insertedMsg) {
      fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            message_id: insertedMsg.id,
            customer_id: customer.id,
            phone: normalizedPhone,
            text: content,
          }),
        }
      ).catch((err) => console.error("⚠️ process-message error:", err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "processed",
        customer_id: customer.id,
        type,
        direction,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
    const errorStack = error instanceof Error ? error.stack : "";
    
    if (error instanceof z.ZodError) {
      console.error("❌ [webhook-zapi] Validação falhou:", JSON.stringify(error.errors));
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error(`❌ [webhook-zapi] Erro:`, error);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function findOrCreateCustomer(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  displayName?: string,
  allowSearchOnly = false
): Promise<{ id: string; name: string } | null> {
  const { data: existing, error: searchError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("phone", phone)
    .single();

  if (!searchError && existing) return existing;

  if (searchError?.code === "PGRST116") {
    if (allowSearchOnly) return null;

    const name = displayName || `Cliente ${phone.slice(-4)}`;
    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert({ phone: phone, name })
      .select("id, name")
      .single();

    if (createError) {
      if (createError.code === "23505") {
        const { data: raceWinner } = await supabase
          .from("customers")
          .select("id, name")
          .eq("phone", phone)
          .single();
        return raceWinner;
      }
      console.error("❌ Erro ao criar customer:", createError);
      return null;
    }

    return newCustomer;
  }

  console.error("❌ Erro ao buscar customer:", searchError);
  return null;
}

Deno.serve(handleZapiWebhook);
