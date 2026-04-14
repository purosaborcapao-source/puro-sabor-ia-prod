import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { ZapiWebhookSchema, extractMessageContent } from "./schema.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// ─── Tipos para a configuração do bot de saudação ─────────────────────────
interface ShortcutLocation {
  key: "1";
  type: "location";
  message: string;
  maps_url: string;
  image_url: string;
  tips: string;
}
interface ShortcutLink {
  key: "2";
  type: "link";
  message: string;
  url: string;
  tips: string;
}
interface ShortcutPix {
  key: "3";
  type: "pix";
  message: string;
  pix_key: string;
  pix_instructions: string;
}
type BotShortcut = ShortcutLocation | ShortcutLink | ShortcutPix;

interface BotGreetingConfig {
  enabled: boolean;
  only_when_offline: boolean;
  greeting_message: string;
  shortcuts: BotShortcut[];
}

// ─── Envio de mensagem de texto via Z-API ────────────────────────────────
async function sendZapiText(phone: string, message: string): Promise<void> {
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID") || Deno.env.get("NEXT_PUBLIC_ZAPI_INSTANCE_ID");
  const token = Deno.env.get("ZAPI_TOKEN") || Deno.env.get("NEXT_PUBLIC_ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";

  if (!instanceId || !token) {
    console.warn("⚠️ [bot] ZAPI_INSTANCE_ID ou ZAPI_TOKEN não configurados. Mensagem não enviada.");
    return;
  }

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientToken ? { "Client-Token": clientToken } : {}),
    },
    body: JSON.stringify({ phone, message }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ [bot] Erro ao enviar texto via Z-API:", err);
  } else {
    console.log("✅ [bot] Texto enviado para", phone);
  }
}

// ─── Envio de imagem via Z-API ────────────────────────────────────────────
async function sendZapiImage(phone: string, imageUrl: string, caption?: string): Promise<void> {
  const instanceId = Deno.env.get("ZAPI_INSTANCE_ID") || Deno.env.get("NEXT_PUBLIC_ZAPI_INSTANCE_ID");
  const token = Deno.env.get("ZAPI_TOKEN") || Deno.env.get("NEXT_PUBLIC_ZAPI_TOKEN");
  const clientToken = Deno.env.get("ZAPI_CLIENT_TOKEN") || "";

  if (!instanceId || !token) return;

  const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-image`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientToken ? { "Client-Token": clientToken } : {}),
    },
    body: JSON.stringify({ phone, image: imageUrl, caption: caption || "" }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("❌ [bot] Erro ao enviar imagem via Z-API:", err);
  } else {
    console.log("✅ [bot] Imagem enviada para", phone);
  }
}

// ─── Verifica se há operadores online ────────────────────────────────────
async function hasOperatorOnline(supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const { data, error } = await supabase
    .from("operator_sessions")
    .select("id")
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .limit(1);

  if (error) {
    console.warn("⚠️ [bot] Não foi possível verificar sessões de operador:", error.message);
    return false; // em caso de erro, assume offline para não bloquear a saudação
  }

  return (data?.length ?? 0) > 0;
}

// ─── Normaliza o texto de resposta do cliente para comparação ─────────────
function normalizeShortcutInput(text: string): string {
  const trimmed = text.trim().toLowerCase();
  const map: Record<string, string> = {
    "1": "1", "um": "1", "1️⃣": "1",
    "2": "2", "dois": "2", "2️⃣": "2",
    "3": "3", "três": "3", "tres": "3", "3️⃣": "3",
  };
  return map[trimmed] ?? "";
}

// ─── Processa e envia resposta de atalho ─────────────────────────────────
async function handleShortcutReply(
  phone: string,
  shortcutKey: string,
  shortcuts: BotShortcut[]
): Promise<void> {
  const shortcut = shortcuts.find((s) => s.key === shortcutKey);
  if (!shortcut) return;

  if (shortcut.type === "location") {
    const s = shortcut as ShortcutLocation;
    let msg = s.message;
    if (s.maps_url) msg += `\n\n🗺️ ${s.maps_url}`;
    if (s.tips) msg += `\n\n💡 ${s.tips}`;
    await sendZapiText(phone, msg);
    if (s.image_url) {
      await sendZapiImage(phone, s.image_url, "📸 Nossa fachada");
    }
  } else if (shortcut.type === "link") {
    const s = shortcut as ShortcutLink;
    let msg = s.message;
    if (s.url) msg += `\n\n🔗 ${s.url}`;
    if (s.tips) msg += `\n\n${s.tips}`;
    await sendZapiText(phone, msg);
  } else if (shortcut.type === "pix") {
    const s = shortcut as ShortcutPix;
    let msg = s.message;
    if (s.pix_key) msg += `\n\n🔑 *Chave PIX:*\n\`${s.pix_key}\``;
    if (s.pix_instructions) msg += `\n\n${s.pix_instructions}`;
    await sendZapiText(phone, msg);
  }
}

// ─── Motor principal do bot de saudação ──────────────────────────────────
async function runGreetingBot(
  supabase: ReturnType<typeof createClient>,
  customerId: string,
  phone: string,
  messageContent: string,
  greetingWindowMs = 30 * 60 * 1000
): Promise<void> {
  // 1. Carregar configuração
  const { data: settingsRow } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "bot_greeting_config")
    .single();

  if (!settingsRow?.value) return;

  const config = settingsRow.value as BotGreetingConfig;
  if (!config.enabled) return;

  // 2. Verificar disponibilidade de operadores se necessário
  if (config.only_when_offline) {
    const online = await hasOperatorOnline(supabase);
    if (online) {
      console.log("ℹ️ [bot] Operador online — saudação automática suspensa.");
      return;
    }
  }

  // 3. Buscar estado da conversa
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, greeting_sent_at")
    .eq("customer_id", customerId)
    .maybeSingle();

  const greetingSentAt = conversation?.greeting_sent_at
    ? new Date(conversation.greeting_sent_at)
    : null;

  const shortcutWindowMs = greetingWindowMs;
  const isWithinShortcutWindow =
    greetingSentAt && Date.now() - greetingSentAt.getTime() < shortcutWindowMs;

  // 4. Se saudação já foi enviada e estamos dentro da janela → processar atalho
  if (greetingSentAt && isWithinShortcutWindow) {
    const key = normalizeShortcutInput(messageContent);
    if (key) {
      console.log(`🤖 [bot] Respondendo atalho "${key}" para ${phone}`);
      await handleShortcutReply(phone, key, config.shortcuts);
    } else {
      console.log("ℹ️ [bot] Resposta fora dos atalhos — deixando para o operador.");
    }
    return;
  }

  // 5. Saudação ainda não enviada (ou expirou a janela) → enviar saudação
  if (!greetingSentAt || !isWithinShortcutWindow) {
    console.log(`🤖 [bot] Enviando saudação para ${phone}`);
    await sendZapiText(phone, config.greeting_message);

    // Marcar greeting_sent_at na conversa
    if (conversation?.id) {
      await supabase
        .from("conversations")
        .update({ greeting_sent_at: new Date().toISOString() })
        .eq("id", conversation.id);
    } else {
      // Conversa pode não existir ainda (será criada pelo trigger) — tentar novamente via upsert
      await supabase
        .from("conversations")
        .upsert(
          { customer_id: customerId, greeting_sent_at: new Date().toISOString() },
          { onConflict: "customer_id" }
        );
    }
  }
}

// ─── Hash SHA-256 (disponível no Deno via Web Crypto API) ─────────────────
async function computeHash(str: string): Promise<string> {
  const data = new TextEncoder().encode(str);
  const buffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32); // 128 bits — espaço de colisão 2^128 vs 2^32 anterior
}

// Fallback external_id quando Z-API não envia messageId
// Usa phone + conteúdo + timestamp arredondado a 10s (tolerância de reentrega)
async function buildFallbackExternalId(phone: string, content: string, momment?: number): Promise<string> {
  const ts = momment ? Math.floor(momment / 10000) : Math.floor(Date.now() / 10000);
  return `fallback:${await computeHash(`${phone}:${content}:${ts}`)}`;
}

// Normaliza telefone para formato consistente (só dígitos)
// Retorna string vazia se o phone não for um número válido de cliente
function normalizePhone(rawPhone: string): string {
  // @lid é sempre um ID interno de chat do WhatsApp, nunca um número de cliente
  if (rawPhone.includes("@lid")) return "";

  // Remove sufixos de chat do WhatsApp (@c.us, @s.whatsapp.net, etc)
  const clean = rawPhone.split("@")[0];
  // Extrai apenas dígitos
  const digits = clean.replace(/\D/g, "");

  // Número muito curto: inválido
  if (!digits || digits.length < 10) return "";

  return digits;
}

// Tenta encontrar um customer pelo nome do chat (para mensagens OUTBOUND @lid)
async function findCustomerByChatName(
  supabase: ReturnType<typeof createClient>,
  chatName?: string
): Promise<{ id: string; name: string } | null> {
  if (!chatName || chatName.trim().length < 2) return null;

  // Busca exata por nome (case-insensitive)
  const { data, error } = await supabase
    .from("customers")
    .select("id, name")
    .ilike("name", chatName.trim())
    .limit(1)
    .maybeSingle();

  if (!error && data) {
    console.log(`✅ [findCustomerByChatName] Encontrado por nome: "${chatName}" → ${data.id}`);
    return data;
  }

  // Busca parcial: o chatName pode ser apelido ou parte do nome
  const { data: partial, error: partialError } = await supabase
    .from("customers")
    .select("id, name")
    .ilike("name", `%${chatName.trim()}%`)
    .limit(1)
    .maybeSingle();

  if (!partialError && partial) {
    console.log(`✅ [findCustomerByChatName] Encontrado por nome parcial: "${chatName}" → ${partial.id}`);
    return partial;
  }

  return null;
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

    // Filtrar grupos e listas de broadcast (antes de qualquer outra lógica)
    if (parsed.phone.includes("@g.us") || parsed.phone.includes("@broadcast")) {
      console.log(`ℹ️ [webhook-zapi] Ignorando mensagem de grupo/lista: ${parsed.phone}`);
      return new Response(JSON.stringify({ success: true, ignored: true, reason: "group_or_list_ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const direction = parsed.fromMe ? "OUTBOUND" : "INBOUND";
    const isLidPhone = parsed.phone.includes("@lid");

    // Normalizar telefone para formato consistente (só dígitos)
    // Para @lid, normalizePhone retorna "" — tratamos abaixo via chatName
    const normalizedPhone = normalizePhone(parsed.phone);

    // Validação: INBOUND sem número válido → ignorar
    if (!normalizedPhone && direction === "INBOUND") {
      console.log(`ℹ️ [webhook-zapi] INBOUND sem número válido: ${parsed.phone}`);
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: "invalid_phone_inbound" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // ─── Camada 1: Construir external_id robusto ───────────────────────────
    // Usa messageId real da Z-API quando disponível; caso contrário, gera fallback
    // por hash de conteúdo para proteger contra reentregas sem messageId.
    const externalId = parsed.messageId
      ? `zapi:${parsed.messageId}`
      : await buildFallbackExternalId(parsed.phone, content, parsed.momment);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── Ler configurações operacionais da tabela settings ────────────────
    const { data: settingsRows } = await supabase
      .from("settings")
      .select("key, value")
      .in("key", ["greeting_window_minutes", "dedup_window_seconds"]);

    const settingsMap = new Map(
      (settingsRows || []).map((r: any) => [r.key, r.value])
    );
    const greetingWindowMs =
      ((settingsMap.get("greeting_window_minutes") as number) || 30) * 60 * 1000;
    const dedupWindowMs =
      ((settingsMap.get("dedup_window_seconds") as number) || 30) * 1000;

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

    // ─── Camada 3: Content dedup — mesma mensagem dentro da janela configurável ──
    // Protege contra retry interno da Z-API que gera um messageId diferente
    // para exatamente o mesmo conteúdo (ex: falha e reenvio automático).
    const dedupWindowAgo = new Date(Date.now() - dedupWindowMs).toISOString();
    const messageType = type.toUpperCase() as "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT" | "VIDEO";

    const { data: contentDuplicate } = await supabase
      .from("messages")
      .select("id")
      .eq("phone", normalizedPhone)
      .eq("direction", direction)
      .eq("type", messageType)
      .eq("content", content)
      .gte("created_at", dedupWindowAgo)
      .limit(1)
      .maybeSingle();

    if (contentDuplicate) {
      console.log(`⚡ [webhook-zapi] Duplicata de conteúdo (últimos ${dedupWindowMs / 1000}s): ${normalizedPhone}/${type}`);
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
    // Estratégia de resolução em cascata:
    // A) Para OUTBOUND @lid: o phone não é o número do cliente → buscar por chatName
    // B) Para OUTBOUND com número: buscar por phone exato ou parcial (não criar)
    // C) Para INBOUND: buscar por phone; criar se não existir
    let activeCustomer: { id: string; name: string } | null = null;
    let resolvedPhone = normalizedPhone; // phone que vai para a mensagem no banco

    if (direction === "OUTBOUND" && isLidPhone) {
      // @lid: buscar customer pelo nome do contato (chatName)
      console.log(`🔍 [webhook-zapi] OUTBOUND @lid — tentando vincular pelo chatName: "${parsed.chatName}"`);
      activeCustomer = await findCustomerByChatName(supabase, parsed.chatName);

      if (!activeCustomer) {
        console.log(`ℹ️ [webhook-zapi] OUTBOUND @lid sem vínculo por nome: chatName="${parsed.chatName}". Ignorando.`);
        return new Response(
          JSON.stringify({ success: true, ignored: true, reason: "outbound_lid_no_customer_match" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      // Usar o phone do customer encontrado para gravar na mensagem (consistência)
      resolvedPhone = activeCustomer.id; // placeholder — sobrescrito abaixo com phone real
      const { data: cData } = await supabase
        .from("customers")
        .select("phone")
        .eq("id", activeCustomer.id)
        .maybeSingle();
      if (cData?.phone) resolvedPhone = cData.phone;

    } else if (direction === "OUTBOUND") {
      // Número normal OUTBOUND: buscar por phone exato ou parcial, NÃO criar
      const customer = await findOrCreateCustomer(supabase, normalizedPhone, parsed.senderName || parsed.chatName, true);
      activeCustomer = customer || await findCustomerByPartialPhone(supabase, normalizedPhone);

      if (!activeCustomer) {
        console.log(`ℹ️ [webhook-zapi] OUTBOUND sem customer: ${normalizedPhone}. Ignorando.`);
        return new Response(
          JSON.stringify({ success: true, ignored: true, reason: "outbound_customer_not_found" }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      // INBOUND: buscar ou criar customer
      activeCustomer = await findOrCreateCustomer(supabase, normalizedPhone, parsed.senderName || parsed.chatName, false);
    }

    // 2. Inserir mensagem
    
    if (!activeCustomer) {
      console.log(`⚠️ [webhook-zapi] Nenhum customer encontrado para vincular: ${resolvedPhone || parsed.phone}`);
      return new Response(
        JSON.stringify({ success: true, ignored: true, reason: "no_customer_found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const insertData = {
      external_id: externalId,
      customer_id: activeCustomer.id,
      phone: resolvedPhone, // phone real do cliente (não o @lid)
      direction,
      type: messageType,
      content,
      media_url,
      payload: {
        raw_text: content,
        zapi_message_id: parsed.messageId,
        sender_name: parsed.senderName,
        fromMe: parsed.fromMe,
        original_phone: parsed.phone, // preserva o phone original para debug
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
            customer_id: activeCustomer.id,
            phone: resolvedPhone,
            text: content,
          }),
        }
      ).catch((err) => console.error("⚠️ process-message error:", err));

      // 4. Bot de saudação automática (fire-and-forget)
      runGreetingBot(supabase, activeCustomer.id, resolvedPhone, content, greetingWindowMs).catch(
        (err) => console.error("⚠️ [bot] Erro no greeting bot:", err)
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: "processed",
        customer_id: activeCustomer.id,
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

async function findCustomerByPartialPhone(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<{ id: string; name: string } | null> {
  // Tentar variações de phone:
  // 1. Com DDD (55xx) -> sem DDD (xx)
  // 2. Sem DDD (xx) -> com DDD (55xx)
  // 3. Com +55 -> sem +
  const variations = [
    phone.replace(/^55(\d{2})/, "$1"), // 5521... -> 21...
    phone.replace(/^(\d{2})$/, "55$1"), // 21... -> 5521...
    phone.replace(/^\+/, ""), // +5521... -> 5521...
  ];

  for (const variant of variations) {
    const { data: existing, error } = await supabase
      .from("customers")
      .select("id, name")
      .eq("phone", variant)
      .single();

    if (!error && existing) {
      console.log(`✅ [findCustomerByPartialPhone] Encontrado com variação: ${variant}`);
      return existing;
    }
  }

  // Buscar por phone que termina com os últimos 8 dígitos
  const last8Digits = phone.slice(-8);
  const { data: bySuffix, error: suffixError } = await supabase
    .from("customers")
    .select("id, name")
    .like("phone", `%${last8Digits}`)
    .limit(1)
    .single();

  if (!suffixError && bySuffix) {
    console.log(`✅ [findCustomerByPartialPhone] Encontrado por sufixo: ${last8Digits}`);
    return bySuffix;
  }

  return null;
}

Deno.serve(handleZapiWebhook);
