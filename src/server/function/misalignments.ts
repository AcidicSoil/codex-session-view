import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { logError, logInfo } from '~/lib/logger'
import { updateMisalignmentStatus } from '~/server/persistence/misalignments'

const mutationInput = z.object({
  sessionId: z.string().min(1),
  misalignmentId: z.string().min(1),
  status: z.union([z.literal('open'), z.literal('acknowledged'), z.literal('dismissed')]),
})

export const mutateMisalignmentStatus = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => mutationInput.parse(data))
  .handler(async ({ data }) => {
    try {
      const { record, previousStatus } = await updateMisalignmentStatus(data.sessionId, data.misalignmentId, data.status)
      logInfo('chatbot.misalignment', 'Updated misalignment status', {
        sessionId: data.sessionId,
        misalignmentId: data.misalignmentId,
        oldStatus: previousStatus,
        newStatus: record.status,
        userId: null,
        at: new Date().toISOString(),
      })
      return record
    } catch (error) {
      logError('chatbot.misalignment', 'Failed to update misalignment status', error as Error)
      throw error
    }
  })
