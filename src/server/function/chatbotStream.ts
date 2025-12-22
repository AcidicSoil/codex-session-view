import { createServerFn } from '@tanstack/react-start'
import { streamInputSchema } from '~/server/chatbot-api/schema'

export const streamChat = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => streamInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { streamChatFromPayload } = await import('~/server/chatbot-api.server')
    return streamChatFromPayload(data)
  })
