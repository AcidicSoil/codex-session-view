import { createFileRoute } from '@tanstack/react-router'
import { sessionRepoContextInputSchema } from '~/server/function/sessionRepoContext.shared'

export const Route = createFileRoute('/api/session/repo-context')(
  (import.meta.env.SSR
    ? {
        server: {
          handlers: {
            POST: async ({ request }: { request: Request }) => {
              const body = await request.json().catch(() => null)
              const parsed = sessionRepoContextInputSchema.safeParse(body)
              if (!parsed.success) {
                return new Response(
                  JSON.stringify({ error: 'INVALID_INPUT', issues: parsed.error.flatten() }),
                  {
                    status: 400,
                    headers: { 'content-type': 'application/json' },
                  },
                )
              }
              const { handleSessionRepoContextAction } = await import('~/server/function/sessionRepoContext')
              const result = await handleSessionRepoContextAction(parsed.data)
              return new Response(JSON.stringify(result), {
                status: 200,
                headers: { 'content-type': 'application/json' },
              })
            },
          },
        },
      }
    : {}) as any,
)
