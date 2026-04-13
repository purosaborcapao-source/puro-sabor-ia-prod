import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import path from "path";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

type ApiResponse = {
  success: boolean;
  url?: string;
  error?: string;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest & { formData: () => Promise<FormData> },
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const formData = await (req as any).formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return res.status(400).json({ success: false, error: "No file provided" });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "audio/mpeg",
      "audio/mp3",
      "audio/wav",
      "audio/ogg",
      "audio/webm",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      return res.status(400).json({ success: false, error: "File type not allowed" });
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return res.status(400).json({ success: false, error: "File too large (max 50MB)" });
    }

    const ext = path.extname(file.name);
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const bucketPath = `uploads/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from("media")
      .upload(bucketPath, buffer, {
        cacheControl: "public, max-age=31536000",
        contentType: file.type,
      });

    if (error) {
      console.error("❌ Upload error:", error);
      return res.status(500).json({ success: false, error: error.message });
    }

    const { data: urlData } = supabase.storage
      .from("media")
      .getPublicUrl(bucketPath);

    return res.status(200).json({ success: true, url: urlData.publicUrl });
  } catch (err) {
    console.error("🔥 Upload API error:", err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
}