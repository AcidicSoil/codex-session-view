import { describeRepoRootFailure, resolveRepoRootForAssetPath } from '~/server/lib/sessionRepoRoots.server'
import { clearAgentRulesCache, clearSessionSnapshotCache } from '~/server/lib/chatbotData.server'
import { clearSessionRepoBinding, setSessionRepoBinding } from '~/server/persistence/sessionRepoBindings'
import type { SessionRepoContextInput } from './sessionRepoContext.shared'
import type { SessionRepoContextResponse } from './sessionRepoContext'

export async function handleSessionRepoContextActionServer(
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
