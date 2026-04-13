import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Z-API sends phone without '+' prefix — e.g. "5511999999999"
const phoneSchema = z.string().min(10).max(20);

// Text message payload
const ZapiTextSchema = z.object({
  message: z.string().min(1),
});

// Image or audio or document payload
const ZapiMediaSchema = z.object({
  imageUrl: z.string().url().optional(),
  audioUrl: z.string().url().optional(),
  documentUrl: z.string().url().optional(),
  caption: z.string().optional(),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
});

// Full incoming webhook payload from Z-API
export const ZapiWebhookSchema = z.object({
  isMessage: z.boolean().optional(),
  zaapId: z.string().optional(),
  messageId: z.string().optional(),
  phone: phoneSchema,
  fromMe: z.boolean().optional().default(false),
  momment: z.number().optional(), // Z-API typo: "momment" (not "moment")
  type: z.string().optional().default("text"),
  chatName: z.string().optional(),
  senderName: z.string().optional(),
  // text messages
  text: ZapiTextSchema.optional(),
  // image messages
  image: ZapiMediaSchema.optional(),
  // audio messages
  audio: ZapiMediaSchema.optional(),
  // document messages
  document: ZapiMediaSchema.optional(),
  // video messages
  video: ZapiMediaSchema.optional(),
});

export type ZapiWebhookPayload = z.infer<typeof ZapiWebhookSchema>;

// Legacy export for backward compatibility
export const WebhookRequestSchema = ZapiWebhookSchema;
export type WebhookRequest = ZapiWebhookPayload;
export type ZapiMessage = ZapiWebhookPayload;

// Helper to extract content and type from webhook payload
export function extractMessageContent(payload: ZapiWebhookPayload): {
  content: string;
  type: "text" | "image" | "audio" | "document" | "video";
  media_url: string | null;
} {
  if (payload.text?.message) {
    return { content: payload.text.message, type: "text", media_url: null };
  }
  if (payload.image?.imageUrl) {
    return {
      content: payload.image.caption || "[Imagem]",
      type: "image",
      media_url: payload.image.imageUrl,
    };
  }
  if (payload.audio?.audioUrl) {
    return {
      content: "[Áudio]",
      type: "audio",
      media_url: payload.audio.audioUrl,
    };
  }
  if (payload.document?.documentUrl) {
    return {
      content: payload.document.fileName || "[Documento]",
      type: "document",
      media_url: payload.document.documentUrl,
    };
  }
  if (payload.video?.videoUrl as any) {
    return {
      content: payload.video?.caption || "[Vídeo]",
      type: "video",
      media_url: (payload.video as any)?.videoUrl || null,
    };
  }
  return { content: "[Mensagem não suportada]", type: "text", media_url: null };
}
