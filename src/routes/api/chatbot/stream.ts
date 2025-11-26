import { createFileRoute } from '@tanstack/react-router'
import { streamChatFromPayload } from '~/server/chatbot-api.server'

export const Route = createFileRoute('/api/chatbot/stream')({
  ...( {
    server: {
      handlers: {
        POST: async ({ request }: { request: Request }) => {
          let body: unknown = null
          try {
            body = await request.json()
          } catch (error) {
            body = null
          }
          return streamChatFromPayload(body)
        },
      },
    },
  } as any),
})
