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

    // Ignorar eventos que não são mensagens de entrada de conteúdo
    if (!parsed.isMessage && !parsed.text && !parsed.image && !parsed.audio && !parsed.document) {
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "not_a_message_event" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ─── Camada 0: Filtragem de Grupos, Listas e Broadcasts ───────────────
    // Evita processar mensagens de grupos ou listas de transmissão que geram "leads fantasma"
    // Mantemos @lid pois são identificadores de contatos legítimos no WhatsApp
    if (parsed.phone.includes("@g.us") || parsed.phone.includes("@broadcast")) {
      console.log(`ℹ️ [webhook-zapi] Ignorando mensagem de grupo/lista: ${parsed.phone}`);
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "group_or_list_ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { content, type, media_url } = extractMessageContent(parsed);
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
    const contentHash = simpleHash(`${parsed.phone}:${content}:${type}`);
    const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString();
    const normalizedPhone = parsed.phone.replace(/\D/g, "");
    const direction = parsed.fromMe ? "OUTBOUND" : "INBOUND";

    const { data: contentDuplicate } = await supabase
      .from("messages")
      .select("id")
      .eq("phone", normalizedPhone)
      .eq("direction", direction)
      .eq("type", type)
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
      phone: parsed.phone,
      type,
      externalId,
      content: content.substring(0, 60),
    });

    // 1. Find or create customer
    // Se for OUTBOUND (aparelho), não criamos novo customer/lead. Apenas vinculamos se já existir.
    const customer = await findOrCreateCustomer(
      supabase, 
      parsed.phone, 
      parsed.senderName || parsed.chatName,
      direction === "OUTBOUND" // allowSearchOnly
    );

    if (!customer) {
      console.log(`ℹ️ [webhook-zapi] Customer não encontrado para mensagem OUTBOUND: ${parsed.phone}. Ignorando.`);
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: "outbound_customer_not_found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 2. Salvar mensagem com external_id garantido + content_hash no payload
    const { data: messageRecord, error: messageError } = await supabase
      .from("messages")
      .upsert({
        external_id: externalId,
        customer_id: customer.id,
        phone: parsed.phone.replace(/\D/g, ""),
        direction,
        type: type.toUpperCase() as any,
        content,
        media_url,
        sender_name: parsed.senderName || parsed.chatName,
        payload: {
          raw_text: content,
          content_hash: contentHash,         // armazenado para content dedup futuro
          zapi_message_id: parsed.messageId,
          zapi_id: parsed.zaapId,
          sender_name: parsed.senderName,
          fromMe: parsed.fromMe,
        },
        zapi_status: "DELIVERED",
      }, { onConflict: "external_id" })     // Camada 4: proteção contra race conditions
      .select()
      .maybeSingle();

    if (messageError) {
      console.error("❌ [webhook-zapi] Erro ao inserir mensagem:", messageError);
      throw messageError;
    }

    if (!messageRecord) {
      // Upsert retornou null: conflito de external_id detectado na camada de BD
      console.log(`⚡ [webhook-zapi] Duplicata detectada (DB constraint): ${externalId}`);
      return new Response(
        JSON.stringify({ success: true, status: "already_processed_db_constraint" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Disparar processamento de IA apenas para mensagens INBOUND de texto genuinamente novas
    if (type === "text" && direction === "INBOUND") {
      fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({
            message_id: messageRecord.id,
            customer_id: customer.id,
            phone: parsed.phone,
            text: content,
          }),
        }
      ).catch((err) => console.error("⚠️ process-message error:", err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "processed",
        message_id: messageRecord.id,
        customer_id: customer.id,
        type,
        direction,
        external_id: externalId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ [webhook-zapi] Validação falhou:", error.errors);
      return new Response(
        JSON.stringify({ error: "Invalid payload", details: error.errors }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.error("❌ [webhook-zapi] Erro:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
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
  const normalizedPhone = phone.replace(/\D/g, "");

  const { data: existing, error: searchError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("phone", normalizedPhone)
    .single();

  if (!searchError && existing) return existing;

  if (searchError?.code === "PGRST116") {
    if (allowSearchOnly) return null;

    const name = displayName || `Cliente ${normalizedPhone.slice(-4)}`;
    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert({ phone: normalizedPhone, name })
      .select("id, name")
      .single();

    if (createError) {
      // Race condition: outro request criou o customer simultaneamente
      if (createError.code === "23505") {
        const { data: raceWinner } = await supabase
          .from("customers")
          .select("id, name")
          .eq("phone", normalizedPhone)
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
