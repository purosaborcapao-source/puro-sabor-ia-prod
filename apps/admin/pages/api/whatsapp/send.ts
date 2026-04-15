import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ZAPI_INSTANCE_ID = process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID;
const ZAPI_TOKEN = process.env.NEXT_PUBLIC_ZAPI_TOKEN;
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;

// Client-Token is the security key from Z-API dashboard (Security tab)
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";


type ApiResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: unknown;
  warning?: string;
  zapiId?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { type, phone, message, imageUrl, audioUrl, documentUrl, fileName, caption, customerId, operatorId } =
    req.body as Record<string, string>;

  if (!phone || !type) {
    return res.status(400).json({ success: false, error: "phone and type are required" });
  }

  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
    console.error("❌ Z-API credentials missing in environment variables");
    return res.status(500).json({ success: false, error: "WhatsApp integration not configured" });
  }

  // Normalize phone: Z-API expects digits only
  const normalizedPhone = phone.replace(/\D/g, "");

  try {
    let zapiEndpoint = "";
    let zapiBody: Record<string, unknown> = { phone: normalizedPhone };

    switch (type.toLowerCase()) {
      case "text":
        if (!message) return res.status(400).json({ success: false, error: "message is required for text" });
        zapiEndpoint = `${ZAPI_BASE}/send-text`;
        zapiBody = { phone: normalizedPhone, message };
        break;

      case "image":
        if (!imageUrl) return res.status(400).json({ success: false, error: "imageUrl is required for image" });
        zapiEndpoint = `${ZAPI_BASE}/send-image`;
        zapiBody = { phone: normalizedPhone, image: imageUrl, caption: caption || "" };
        break;

      case "audio":
        if (!audioUrl) return res.status(400).json({ success: false, error: "audioUrl is required for audio" });
        zapiEndpoint = `${ZAPI_BASE}/send-audio`;
        zapiBody = { phone: normalizedPhone, audio: audioUrl };
        break;

      case "document":
        if (!documentUrl) return res.status(400).json({ success: false, error: "documentUrl is required for document" });
        zapiEndpoint = `${ZAPI_BASE}/send-document`;
        zapiBody = { phone: normalizedPhone, document: documentUrl, fileName: fileName || "documento" };
        break;

      default:
        return res.status(400).json({ success: false, error: `Unsupported type: ${type}` });
    }

    // Call Z-API
    console.log(`🚀 [whatsapp/send] Initing send to ${normalizedPhone} via Z-API...`);
    const zapiRes = await fetch(zapiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ZAPI_CLIENT_TOKEN ? { "Client-Token": ZAPI_CLIENT_TOKEN } : {}),
      },
      body: JSON.stringify(zapiBody),
    });

    const zapiData = await zapiRes.json();

    if (!zapiRes.ok) {
      console.error("❌ [whatsapp/send] Z-API Error Response:", zapiData);
      return res.status(zapiRes.status).json({
        success: false,
        error: zapiData?.error || zapiData?.message || "Z-API request failed",
        details: zapiData
      });
    }

    console.log("✅ [whatsapp/send] Z-API Delivery Success:", zapiData.messageId);

    // Save outgoing message to Supabase (com ou sem customerId)
    const dbType = type.toUpperCase() as "TEXT" | "IMAGE" | "AUDIO" | "DOCUMENT";

    let operatorName = null;
    if (operatorId) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", operatorId)
        .single();
      if (profileData) operatorName = profileData.name;
    }

    const { error: insertErr } = await supabase.from("messages").insert({
      customer_id: customerId || null,
      phone: normalizedPhone,
      direction: "OUTBOUND",
      type: dbType,
      content: message || caption || `[${type}]`,
      media_url: imageUrl || audioUrl || documentUrl || null,
      payload: { zapi_message_id: zapiData.messageId },
      zapi_status: "SENT",
      external_id: zapiData.messageId ? `zapi:${zapiData.messageId}` : null,
      sent_by_operator_id: operatorId || null,
      sent_by_operator_name: operatorName,
    });

    if (insertErr) {
      console.error("❌ [whatsapp/send] Supabase Save Error:", insertErr);
      // Do not fail the request if Z-API succeeded
      return res.status(200).json({
        success: true,
        warning: "Message sent but failed to record in DB",
        zapiId: zapiData.messageId
      });
    }

    console.log("✅ [whatsapp/send] Persisted to Database");

    return res.status(200).json({ success: true, messageId: zapiData.messageId });
  } catch (err) {
    console.error("🔥 [whatsapp/send] Fatal API Error:", err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
}
