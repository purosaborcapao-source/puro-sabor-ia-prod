import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

type ApiResponse = {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: unknown;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  const { type, phone, message } = req.body;

  if (!phone || !type) {
    return res.status(400).json({ success: false, error: "phone and type are required" });
  }

  const ZAPI_INSTANCE_ID = process.env.NEXT_PUBLIC_ZAPI_INSTANCE_ID;
  const ZAPI_TOKEN = process.env.NEXT_PUBLIC_ZAPI_TOKEN;
  const ZAPI_BASE = `https://api.z-api.io/instances/${ZAPI_INSTANCE_ID}/token/${ZAPI_TOKEN}`;

  if (!ZAPI_INSTANCE_ID || !ZAPI_TOKEN) {
    return res.status(500).json({ success: false, error: "WhatsApp not configured on server" });
  }

  const normalizedPhone = phone.replace(/\D/g, "");

  try {
    let zapiEndpoint = "";
    const zapiBody: Record<string, unknown> = { phone: normalizedPhone };

    switch (type.toLowerCase()) {
      case "text":
        zapiEndpoint = `${ZAPI_BASE}/send-text`;
        zapiBody.message = message;
        break;
      default:
        return res.status(400).json({ success: false, error: "Invalid message type" });
    }

    const zapiResponse = await fetch(zapiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-Token": process.env.ZAPI_CLIENT_TOKEN || "",
      },
      body: JSON.stringify(zapiBody),
    });

    let zapiData;
    try {
      zapiData = await zapiResponse.json();
    } catch {
      const text = await zapiResponse.text();
      return res.status(400).json({ success: false, error: "Invalid Z-API response", details: text });
    }

    if (!zapiResponse.ok) {
      console.error("Z-API failed:", zapiData);
      return res.status(400).json({ success: false, error: zapiData?.error || "Failed to send", details: zapiData });
    }

    console.log("✅ Z-API success:", zapiData);

    // Salvar mensagem no banco
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: insertErr } = await supabase.from("messages").insert({
      phone: normalizedPhone,
      direction: "OUTBOUND",
      type: "TEXT",
      content: message || "",
      payload: { zapi_message_id: zapiData.messageId },
      zapi_status: "SENT",
      external_id: zapiData.messageId ? `zapi:${zapiData.messageId}` : null,
    });

    if (insertErr) {
      console.error("Save Error:", insertErr);
    }

    console.log("✅ Message sent, saved to DB:", zapiData.messageId);
    return res.status(200).json({ success: true, messageId: zapiData.messageId });
  } catch (err) {
    console.error("API Error:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: "Erro: " + errorMessage });
  }
}