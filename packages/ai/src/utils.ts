import { anthropic } from './client'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function createMessage(
  messages: ChatMessage[],
  model: string = 'claude-3-5-sonnet-20241022'
) {
  return anthropic.messages.create({
    model,
    max_tokens: 1024,
    messages
  })
}

export async function* streamMessage(
  messages: ChatMessage[],
  model: string = 'claude-3-5-sonnet-20241022'
) {
  const stream = await anthropic.messages.stream({
    model,
    max_tokens: 1024,
    messages
  })

  for await (const chunk of stream) {
    yield chunk
  }
}

export function extractTextFromResponse(text: string): string {
  return text.trim()
}
