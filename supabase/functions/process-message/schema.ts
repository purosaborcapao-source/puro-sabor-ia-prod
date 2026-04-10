import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const IntentEnum = z.enum([
  "NEW_ORDER",
  "ORDER_INQUIRY",
  "ORDER_TRACKING",
  "CANCEL_ORDER",
  "COMPLAINT",
  "FEEDBACK",
  "GENERAL_CHAT",
  "OTHER",
]);

export type Intent = z.infer<typeof IntentEnum>;

export const ProcessMessageRequestSchema = z.object({
  message_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  phone: z.string(),
  text: z.string().min(1),
});

export type ProcessMessageRequest = z.infer<typeof ProcessMessageRequestSchema>;

export const MessagePayloadSchema = z.object({
  intent: IntentEnum,
  confidence: z.number().min(0).max(1),
  extracted_data: z.record(z.unknown()).optional(),
  suggested_response: z.string().optional(),
  should_escalate: z.boolean().default(false),
  raw_text: z.string(),
});

export type MessagePayload = z.infer<typeof MessagePayloadSchema>;
