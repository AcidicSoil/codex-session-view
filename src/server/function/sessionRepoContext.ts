import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { describeRepoRootFailure, resolveRepoRootForAssetPath, type RepoRootMissingReason } from '~/server/lib/sessionRepoRoots'
import { clearSessionRepoBinding, setSessionRepoBinding, type SessionRepoBindingRecord } from '~/server/persistence/sessionRepoBindings'

const inputSchema = z.discriminatedUnion('action', [
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

export interface SessionRepoContextResponse {
  status: 'ok' | 'error' | 'cleared'
  repoContext?: SessionRepoBindingRecord
  message?: string
  reason?: RepoRootMissingReason
}

export const sessionRepoContext = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { clearAgentRulesCache } = await import('~/server/lib/chatbotData')
    if (data.action === 'clear') {
      await clearSessionRepoBinding(data.sessionId)
      clearAgentRulesCache()
      return { status: 'cleared' } satisfies SessionRepoContextResponse
    }

    const resolution = await resolveRepoRootForAssetPath(data.assetPath)
    if (!resolution.rootDir) {
      return {
        status: 'error',
        reason: resolution.reason ?? 'missing-file-path',
        message: describeRepoRootFailure(resolution.reason),
      } satisfies SessionRepoContextResponse
    }

    const record = await setSessionRepoBinding({
      sessionId: data.sessionId,
      assetPath: resolution.assetPath ?? data.assetPath,
      rootDir: resolution.rootDir,
    })
    clearAgentRulesCache(resolution.rootDir)
    return {
      status: 'ok',
      repoContext: record,
    } satisfies SessionRepoContextResponse
  })
