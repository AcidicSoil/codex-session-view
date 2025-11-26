import { createFileRoute } from '@tanstack/react-router'
import { analyzeChatFromPayload } from '~/server/chatbot-api.server'

export const Route = createFileRoute('/api/chatbot/analyze')({
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
          return analyzeChatFromPayload(body)
        },
      },
    },
  } as any),
})
