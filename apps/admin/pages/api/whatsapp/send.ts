import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const ZAPI_INSTANCE_ID = "3F175AF7F1DD51672580B20DE66F3711";
const ZAPI_TOKEN = "AF53FC81B3501F7AC37AEC66";
const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;

// Client-Token is the security key from Z-API dashboard (Security tab)
// Set in .env.local as ZAPI_CLIENT_TOKEN
const ZAPI_CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN || "";

type SendPayload =
  | { type: "text"; phone: string; message: string }
  | { type: "image"; phone: string; imageUrl: string; caption?: string }
  | { type: "audio"; phone: string; audioUrl: string }
  | { type: "document"; phone: string; documentUrl: string; fileName: string };

type ApiResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { type, phone, message, imageUrl, audioUrl, documentUrl, fileName, caption, customerId } =
    req.body as Record<string, string>;

  if (!phone || !type) {
    return res.status(400).json({ success: false, error: "phone and type are required" });
  }

  // Normalize phone: Z-API expects digits only
  const normalizedPhone = phone.replace(/\D/g, "");

  try {
    let zapiEndpoint = "";
    let zapiBody: Record<string, unknown> = { phone: normalizedPhone };

    switch (type) {
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
      console.error("❌ Z-API error:", zapiData);
      return res.status(zapiRes.status).json({
        success: false,
        error: zapiData?.error || "Z-API request failed",
      });
    }

    // Save outgoing message to Supabase
    if (customerId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      await supabase.from("messages").insert({
        customer_id: customerId,
        phone: normalizedPhone,
        direction: "OUTGOING",
        type,
        content: message || caption || `[${type}]`,
        media_url: imageUrl || audioUrl || documentUrl || null,
        payload: { zapi_message_id: zapiData.messageId },
        zapi_status: "DELIVERED",
      });
    }

    return res.status(200).json({ success: true, messageId: zapiData.messageId });
  } catch (err) {
    console.error("❌ Send error:", err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
}
