import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { logInfo } from '~/lib/logger'

const inputSchema = z.object({
  providerId: z.string(),
  modelId: z.string().optional(),
})

export const providerKeepAlive = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    // In a real implementation, this would ping the provider to keep the model loaded.
    // For now, we'll just log it for telemetry.
    logInfo('provider.keepAlive', 'Keep-alive signal received', {
      providerId: data.providerId,
      modelId: data.modelId,
    })
    return { status: 'ok', timestamp: Date.now() }
  })
