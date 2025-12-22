import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

const loadSessionStoreServer = createServerOnlyFn(() => import('./sessionStore.server'))

const inputSchema = z.object({
  filename: z.string().min(1).max(256),
  content: z.string().min(1),
  persist: z.boolean().optional(),
});

export const persistSessionFile = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { persistSessionFileServer } = await loadSessionStoreServer()
    return persistSessionFileServer(data)
  })
