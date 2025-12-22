import { createServerFn } from '@tanstack/react-start'
import { analyzeInputSchema } from '~/server/chatbot-api/schema'

export const analyzeChat = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => analyzeInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { analyzeChatFromPayload } = await import('~/server/chatbot-api.server')
    return analyzeChatFromPayload(data)
  })
