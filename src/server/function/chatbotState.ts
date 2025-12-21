import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

const loadChatbotStateServer = createServerOnlyFn(() => import('./chatbotState.server'))

const inputSchema = z.object({
  sessionId: z.string().min(1),
  mode: z.union([z.literal('session'), z.literal('general')]).default('session'),
  reset: z.boolean().optional(),
  threadId: z.string().optional(),
})

export const fetchChatbotState = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { fetchChatbotStateServer } = await loadChatbotStateServer()
    return fetchChatbotStateServer(data)
  })
