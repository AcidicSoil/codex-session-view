import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const sessionSnapshotInputSchema = z.object({
  sessionId: z.string().min(1),
  assetPath: z.string().min(1).optional(),
})

export const fetchSessionSnapshot = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => sessionSnapshotInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { loadSessionSnapshot } = await import('~/server/lib/chatbotData.server')
    return loadSessionSnapshot(data.sessionId, { assetPath: data.assetPath, requireAsset: true })
  })
