import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
};

const encoder = new TextEncoder();

export const Route = createFileRoute('/api/uploads/$uploadId/watch')(
  (import.meta.env.SSR
    ? {
        params: {
          parse: z.object({ uploadId: z.string().min(1) }).parse,
        },
        server: {
          handlers: {
            GET: async ({ params, request }: { params: { uploadId: string }; request: Request }) => {
              const [{ subscribeToUploadWatcher }, { getSessionUploadSummaryById }] = await Promise.all([
                import('~/server/lib/sessionUploadWatchers.server'),
                import('~/server/persistence/sessionUploads.server'),
              ])

              const summary = getSessionUploadSummaryById(params.uploadId)
              if (!summary) {
                return new Response(JSON.stringify({ error: 'Upload not found' }), {
                  status: 404,
                  headers: { 'content-type': 'application/json' },
                })
              }

              let cleanup: (() => void) | null = null
              const stream = new ReadableStream<Uint8Array>({
                start(controller) {
                  let closed = false
                  const send = (payload: unknown) => {
                    if (closed) return
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
                  }
                  const unsubscribe = subscribeToUploadWatcher(params.uploadId, (event) => {
                    send(event)
                  })
                  const heartbeat = setInterval(() => send({ type: 'ping' }), 15000)
                  const close = () => {
                    if (closed) return
                    closed = true
                    clearInterval(heartbeat)
                    unsubscribe()
                    controller.close()
                  }
                  cleanup = close
                  request.signal.addEventListener('abort', close)
                },
                cancel() {
                  if (cleanup) {
                    cleanup()
                    cleanup = null
                  }
                },
              })

              return new Response(stream, { headers: SSE_HEADERS })
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
