import { ZapiMessage } from "./schema.ts";

export const mockZapiMessages: Record<string, ZapiMessage> = {
  new_order: {
    phone: "+5511999999999",
    message: "Oi! Quero fazer um pedido de 2 bolos de chocolate para amanhã às 14h",
    timestamp: new Date().toISOString(),
    type: "text",
  },
  inquiry: {
    phone: "+5511988888888",
    message: "Quanto custa um bolo de 2kg?",
    timestamp: new Date().toISOString(),
    type: "text",
  },
  complaint: {
    phone: "+5511977777777",
    message: "O bolo que recebi chegou com problema, está amassado.",
    timestamp: new Date().toISOString(),
    type: "text",
  },
  cancel: {
    phone: "+5511966666666",
    message: "Preciso cancelar meu pedido de amanhã.",
    timestamp: new Date().toISOString(),
    type: "text",
  },
  track: {
    phone: "+5511955555555",
    message: "Meu pedido já saiu para entrega?",
    timestamp: new Date().toISOString(),
    type: "text",
  },
  greeting: {
    phone: "+5511944444444",
    message: "Oi tudo bem?",
    timestamp: new Date().toISOString(),
    type: "text",
  },
};

export function getMockMessage(key: keyof typeof mockZapiMessages): ZapiMessage {
  return mockZapiMessages[key];
}

export function createMockMessage(override: Partial<ZapiMessage> = {}): ZapiMessage {
  return {
    phone: "+5511999999999",
    message: "Quero fazer um pedido",
    timestamp: new Date().toISOString(),
    type: "text",
    ...override,
  };
}
