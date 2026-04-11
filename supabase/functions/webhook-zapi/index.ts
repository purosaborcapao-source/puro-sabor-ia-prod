import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { ZapiWebhookSchema, extractMessageContent } from "./schema.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export async function handleZapiWebhook(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();

    console.log("🔔 [webhook-zapi] Payload recebido:", JSON.stringify(body).substring(0, 200));

    // Validate with real Z-API schema
    const parsed = ZapiWebhookSchema.parse(body);

    // Ignore non-message events (status updates, read receipts, etc.)
    if (!parsed.isMessage && !parsed.text && !parsed.image && !parsed.audio && !parsed.document) {
      console.log("ℹ️ [webhook-zapi] Evento ignorado (não é mensagem de entrada)");
      return new Response(JSON.stringify({ success: true, ignored: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { content, type, media_url } = extractMessageContent(parsed);

    console.log("🔄 [webhook-zapi] Mensagem recebida:", {
      phone: parsed.phone,
      type,
      content: content.substring(0, 60),
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Find or create customer
    const customer = await findOrCreateCustomer(supabase, parsed.phone, parsed.senderName || parsed.chatName);

    if (!customer) {
      return new Response(
        JSON.stringify({ error: "Failed to create customer" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [webhook-zapi] Cliente identificado:", customer.id);

    // 2. Save message to DB
    const { data: messageRecord, error: messageError } = await supabase
      .from("messages")
      .insert({
        customer_id: customer.id,
        phone: parsed.phone,
        direction: "INBOUND",
        type,
        content,
        media_url,
        payload: {
          raw_text: content,
          zapi_message_id: parsed.messageId,
          zapi_id: parsed.zaapId,
          sender_name: parsed.senderName,
        },
        zapi_status: "DELIVERED",
      })
      .select()
      .single();

    if (messageError) {
      console.error("❌ [webhook-zapi] Erro ao inserir mensagem:", messageError);
      throw messageError;
    }

    console.log("✅ [webhook-zapi] Mensagem salva:", messageRecord.id);

    // 3. Trigger AI processing for text messages only (passive mode)
    if (type === "text") {
      console.log("🔄 [webhook-zapi] Disparando process-message...");

      // Fire-and-forget: don't await so webhook responds fast
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
        message_id: messageRecord.id,
        customer_id: customer.id,
        type,
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
  displayName?: string
): Promise<{ id: string; name: string } | null> {
  // Normalize phone: remove non-digits
  const normalizedPhone = phone.replace(/\D/g, "");

  const { data: existing, error: searchError } = await supabase
    .from("customers")
    .select("id, name")
    .eq("phone", normalizedPhone)
    .single();

  if (!searchError && existing) return existing;

  if (searchError?.code === "PGRST116") {
    const name = displayName || `Cliente ${normalizedPhone.slice(-4)}`;
    const { data: newCustomer, error: createError } = await supabase
      .from("customers")
      .insert({ phone: normalizedPhone, name })
      .select("id, name")
      .single();

    if (createError) {
      console.error("❌ Erro ao criar customer:", createError);
      return null;
    }

    console.log("✅ Novo customer criado:", newCustomer.id);
    return newCustomer;
  }

  console.error("❌ Erro ao buscar customer:", searchError);
  return null;
}

Deno.serve(handleZapiWebhook);
