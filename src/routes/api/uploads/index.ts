import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const uploadSchema = z.object({
  filename: z.string().min(1).max(256),
  content: z.string().min(1),
})

export const Route = createFileRoute('/api/uploads/')(
  (import.meta.env.SSR
    ? {
        server: {
          handlers: {
            POST: async ({ request }: { request: Request }) => {
              const payload = await request.json().catch(() => null)
              const parsed = uploadSchema.safeParse(payload)
              if (!parsed.success) {
                return new Response(
                  JSON.stringify({ error: 'INVALID_INPUT', issues: parsed.error.flatten() }),
                  { status: 400, headers: { 'content-type': 'application/json' } },
                )
              }

              const { saveSessionUpload } = await import('~/server/persistence/sessionUploads.server')
              const record = await saveSessionUpload(parsed.data.filename, parsed.data.content)
              return new Response(JSON.stringify(record), {
                status: 200,
                headers: { 'content-type': 'application/json' },
              })
            },
          },
        },
      }
    : {}) as any,
)
