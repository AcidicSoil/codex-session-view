import { z } from 'zod'

export const sessionRepoContextInputSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('set'),
    sessionId: z.string().min(1),
    assetPath: z.string().min(1),
  }),
  z.object({
    action: z.literal('clear'),
    sessionId: z.string().min(1),
  }),
])

export type SessionRepoContextInput = z.infer<typeof sessionRepoContextInputSchema>
