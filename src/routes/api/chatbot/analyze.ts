import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/chatbot/analyze')(
  (import.meta.env.SSR
    ? {
        server: {
          handlers: {
            POST: async ({ request }: { request: Request }) => {
              const { analyzeChatFromPayload } = await import('~/server/chatbot-api.server');
              let body: unknown = null;
              try {
                body = await request.json();
              } catch {
                body = null;
              }
              return analyzeChatFromPayload(body);
            },
          },
        },
      }
    : {}) as any,
);
