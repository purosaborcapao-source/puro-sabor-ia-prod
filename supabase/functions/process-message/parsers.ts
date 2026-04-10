import type { Intent } from "./schema.ts";

export interface ParsedMessage {
  intent: Intent;
  confidence: number;
  extracted_data: Record<string, unknown>;
  suggested_response: string;
  should_escalate: boolean;
}

export function parseClaudeResponse(
  claudeText: string,
  fallbackIntent: Intent = "GENERAL_CHAT"
): ParsedMessage {
  // Tentar extrair JSON estruturado da resposta do Claude
  const jsonMatch = claudeText.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    // Se não houver JSON, usar heurísticas simples
    return parseWithHeuristics(claudeText, fallbackIntent);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      intent: parseIntent(parsed.intent) || fallbackIntent,
      confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
      extracted_data: parsed.extracted_data || {},
      suggested_response: parsed.response || "Entendi sua mensagem.",
      should_escalate: parsed.escalate || false,
    };
  } catch {
    return parseWithHeuristics(claudeText, fallbackIntent);
  }
}

function parseIntent(intentText: string | unknown): Intent | null {
  const intents: Intent[] = [
    "NEW_ORDER",
    "ORDER_INQUIRY",
    "ORDER_TRACKING",
    "CANCEL_ORDER",
    "COMPLAINT",
    "FEEDBACK",
    "GENERAL_CHAT",
    "OTHER",
  ];

  if (!intentText) return null;

  const text = String(intentText).toUpperCase().replace(/\s+/g, "_");

  for (const intent of intents) {
    if (text.includes(intent) || intent.includes(text.split("_")[0])) {
      return intent;
    }
  }

  return null;
}

function parseWithHeuristics(
  text: string,
  fallbackIntent: Intent
): ParsedMessage {
  const lowerText = text.toLowerCase();

  // Detectar intent baseado em palavras-chave
  let intent: Intent = fallbackIntent;
  let confidence = 0.3;

  if (
    lowerText.includes("quero") ||
    lowerText.includes("fazer pedido") ||
    lowerText.includes("encomenda")
  ) {
    intent = "NEW_ORDER";
    confidence = 0.7;
  } else if (
    lowerText.includes("quanto custa") ||
    lowerText.includes("preço") ||
    lowerText.includes("valor")
  ) {
    intent = "ORDER_INQUIRY";
    confidence = 0.8;
  } else if (
    lowerText.includes("onde") ||
    lowerText.includes("saiu") ||
    lowerText.includes("chegou")
  ) {
    intent = "ORDER_TRACKING";
    confidence = 0.7;
  } else if (
    lowerText.includes("cancela") ||
    lowerText.includes("desistir")
  ) {
    intent = "CANCEL_ORDER";
    confidence = 0.8;
  } else if (
    lowerText.includes("problema") ||
    lowerText.includes("ruim") ||
    lowerText.includes("amassado")
  ) {
    intent = "COMPLAINT";
    confidence = 0.8;
  }

  return {
    intent,
    confidence,
    extracted_data: extractData(text, intent),
    suggested_response: generateResponse(intent),
    should_escalate: intent === "COMPLAINT" || confidence < 0.5,
  };
}

function extractData(text: string, intent: Intent): Record<string, unknown> {
  const data: Record<string, unknown> = {
    raw_text: text,
  };

  // Tentar extrair data/hora
  const dateMatch = text.match(
    /(?:amanhã|hoje|próximo|daqui a|em)\s+(\d{1,2}[\/\-]\d{1,2})?/i
  );
  if (dateMatch) {
    data.date_mentioned = dateMatch[0];
  }

  // Tentar extrair quantidade
  const quantityMatch = text.match(/(\d+)\s+(bolo|torta|produto)/i);
  if (quantityMatch) {
    data.quantity = parseInt(quantityMatch[1]);
    data.product_type = quantityMatch[2];
  }

  // Tentar extrair hora
  const timeMatch = text.match(/(\d{1,2}):?(\d{2})?\s*(h|am|pm)?/i);
  if (timeMatch) {
    data.time_mentioned = timeMatch[0];
  }

  return data;
}

function generateResponse(intent: Intent): string {
  const responses: Record<Intent, string> = {
    NEW_ORDER: "Obrigado pelo interesse! Como posso ajudá-lo com seu pedido?",
    ORDER_INQUIRY:
      "Ficamos felizes em responder! Qual produto você gostaria de saber o preço?",
    ORDER_TRACKING: "Vou verificar o status do seu pedido para você.",
    CANCEL_ORDER: "Entendo. Vou verificar seu pedido para o cancelamento.",
    COMPLAINT: "Desculpe ouvir isso! Vou conectá-lo com nosso gerente.",
    FEEDBACK: "Obrigado pela sua opinião! Isso nos ajuda a melhorar.",
    GENERAL_CHAT: "Como posso ajudá-lo?",
    OTHER: "Entendi sua mensagem. Como posso ajudá-lo?",
  };

  return responses[intent];
}
