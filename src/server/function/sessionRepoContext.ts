import { createServerFn } from '@tanstack/react-start'
import { describeRepoRootFailure, resolveRepoRootForAssetPath, type RepoRootMissingReason } from '~/server/lib/sessionRepoRoots'
import { clearAgentRulesCache, clearSessionSnapshotCache } from '~/server/lib/chatbotData'
import { clearSessionRepoBinding, setSessionRepoBinding, type SessionRepoBindingRecord } from '~/server/persistence/sessionRepoBindings'
import { sessionRepoContextInputSchema, type SessionRepoContextInput } from './sessionRepoContext.shared'

export interface SessionRepoContextResponse {
  status: 'ok' | 'error' | 'cleared'
  repoContext?: SessionRepoBindingRecord
  message?: string
  reason?: RepoRootMissingReason
}

export async function handleSessionRepoContextAction(
  data: SessionRepoContextInput,
): Promise<SessionRepoContextResponse> {
  if (data.action === 'clear') {
    await clearSessionRepoBinding(data.sessionId)
    clearAgentRulesCache()
    clearSessionSnapshotCache(data.sessionId)
    return { status: 'cleared' }
  }

  const resolution = await resolveRepoRootForAssetPath(data.assetPath)
  if (!resolution.rootDir) {
    return {
      status: 'error',
      reason: resolution.reason ?? 'missing-file-path',
      message: describeRepoRootFailure(resolution.reason),
    }
  }

  const record = await setSessionRepoBinding({
    sessionId: data.sessionId,
    assetPath: resolution.assetPath ?? data.assetPath,
    rootDir: resolution.rootDir,
  })
  clearAgentRulesCache(resolution.rootDir)
  clearSessionSnapshotCache(data.sessionId)
  return {
    status: 'ok',
    repoContext: record,
  }
}

export const sessionRepoContext = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => sessionRepoContextInputSchema.parse(data))
  .handler(async ({ data }) => handleSessionRepoContextAction(data))
