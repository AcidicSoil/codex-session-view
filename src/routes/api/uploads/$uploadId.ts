import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/api/uploads/$uploadId')(
  (import.meta.env.SSR
    ? {
        params: {
          parse: z.object({ uploadId: z.string().min(1) }).parse,
        },
        server: {
          handlers: {
            GET: async ({ params }: { params: { uploadId: string } }) => {
              const { getSessionUploadContent } = await import('~/server/persistence/sessionUploads.server')
              const content = await getSessionUploadContent(params.uploadId)
              if (!content) {
                return new Response('Upload not found', { status: 404 })
              }
              return new Response(content, {
                status: 200,
                headers: {
                  'content-type': 'text/plain; charset=utf-8',
                },
              })
            },
          },
        },
      }
    : {
        params: {
          parse: z.object({ uploadId: z.string().min(1) }).parse,
        },
      }) as any,
)
