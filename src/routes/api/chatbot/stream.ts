import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/chatbot/stream')({
  ...( {
    server: {
      handlers: {
        POST: async ({ request }: { request: Request }) => {
          const { streamChatFromPayload } = await import('~/server/chatbot-api.server')
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
