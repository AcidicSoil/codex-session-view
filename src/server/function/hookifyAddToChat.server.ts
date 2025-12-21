import { evaluateAddToChatContent } from '~/server/lib/hookifyRuntime'
import { recordHookifyDecision } from '~/server/persistence/hookifyDecisions.server'
import { describeRepoRootFailure, resolveRepoRootForAssetPath, type RepoRootResolution } from '~/server/lib/sessionRepoRoots.server'
import { getSessionRepoBinding, setSessionRepoBinding } from '~/server/persistence/sessionRepoBindings'
import { logInfo, logWarn } from '~/lib/logger'
import type { CoachPrefillPayload } from '~/lib/chatbot/types'
import type { SessionSnapshot } from '~/lib/sessions/model'
import { parseSessionToArrays } from '~/lib/session-parser/streaming'
import type { HookifyAddToChatResponse } from './hookifyAddToChat'

export async function handleHookifyAddToChatServer(data: {
  sessionId: string
  source: 'timeline' | 'session' | 'manual'
  content: string
  eventType?: string
  filePath?: string
}): Promise<HookifyAddToChatResponse> {
  const { loadAgentRules } = await import('~/server/lib/chatbotData.server')
  const repoBinding = getSessionRepoBinding(data.sessionId)
  let repoRoot = repoBinding?.rootDir ?? null
  let boundAssetPath = repoBinding?.assetPath ?? null
  let resolution: RepoRootResolution | null = null
  let sessionSnapshot: SessionSnapshot | null = null

  if (typeof data.filePath === 'string' && data.filePath.trim().length > 0) {
    resolution = await resolveRepoRootForAssetPath(data.filePath)
    if (resolution.rootDir) {
      repoRoot = resolution.rootDir
      const assetPath = resolution.assetPath ?? data.filePath
      boundAssetPath = assetPath
      await setSessionRepoBinding({
        sessionId: data.sessionId,
        assetPath,
        rootDir: repoRoot,
      })
      sessionSnapshot = await loadSnapshotFromUpload(assetPath, data.sessionId)
      if (!sessionSnapshot && repoBinding?.assetPath) {
        sessionSnapshot = await loadSnapshotFromUpload(repoBinding.assetPath, data.sessionId)
      }
    } else if (resolution.rootDir === null) {
      sessionSnapshot = await loadSnapshotFromUpload(data.filePath, data.sessionId)
    }
  }

  if (!sessionSnapshot && boundAssetPath) {
    sessionSnapshot = await loadSnapshotFromUpload(boundAssetPath, data.sessionId)
  } else if (!sessionSnapshot && repoBinding?.assetPath) {
    sessionSnapshot = await loadSnapshotFromUpload(repoBinding.assetPath, data.sessionId)
  }

  if (!repoRoot) {
    const skipMessage = describeRepoRootFailure(resolution?.reason)
    const logPayload = {
      sessionId: data.sessionId,
      source: data.source,
      reason: resolution?.reason ?? 'missing-session-root',
      filePath: data.filePath ?? null,
    }
    logWarn('hookify.add-to-chat', 'Skipped Hookify evaluation: repo root unavailable', logPayload)

    const record = await recordHookifyDecision({
      sessionId: data.sessionId,
      source: data.source,
      severity: 'info',
      blocked: false,
      rules: [],
      message: skipMessage,
      annotations: undefined,
      content: data.content,
    })

    return {
      blocked: false,
      severity: 'info',
      rules: [],
      annotations: undefined,
      message: skipMessage,
      decisionId: record.id,
      prefill: { prompt: data.content } as CoachPrefillPayload,
    }
  }

  const agentRules = await loadAgentRules(repoRoot)
  const evaluation = evaluateAddToChatContent({
    sessionId: data.sessionId,
    source: data.source,
    content: data.content,
    agentRules,
    sessionSnapshot,
  })

  const record = await recordHookifyDecision({
    sessionId: data.sessionId,
    source: data.source,
    severity: evaluation.severity,
    blocked: evaluation.blocked,
    rules: evaluation.rules,
    message: evaluation.message,
    annotations: evaluation.annotations,
    content: data.content,
  })

  const logPayload = {
    sessionId: data.sessionId,
    source: data.source,
    severity: evaluation.severity,
    blocked: evaluation.blocked,
    decisionId: record.id,
    ruleCount: evaluation.rules.length,
    repoRoot,
    assetPath: boundAssetPath,
  }

  if (evaluation.blocked) {
    logWarn('hookify.add-to-chat', 'Add to chat blocked by AGENT rules', logPayload)
  } else {
    logInfo('hookify.add-to-chat', 'Add to chat annotated by AGENT rules', logPayload)
  }

  return {
    blocked: evaluation.blocked,
    severity: evaluation.severity,
    rules: evaluation.rules,
    annotations: evaluation.annotations,
    message: evaluation.message,
    decisionId: record.id,
    prefill: evaluation.blocked ? null : evaluation.prefill ?? { prompt: data.content },
  }
}

async function loadSnapshotFromUpload(assetPath: string, sessionId: string): Promise<SessionSnapshot | null> {
  try {
    const normalized = assetPath.startsWith('uploads/') ? assetPath.slice('uploads/'.length) : assetPath
    const { getSessionUploadContentByOriginalName } = await import('~/server/persistence/sessionUploads.server')
    const content = getSessionUploadContentByOriginalName(normalized)
    if (!content) {
      return null
    }
    const blob = new Blob([content], { type: 'application/json' })
    const result = await parseSessionToArrays(blob)
    if (!result.meta || !Array.isArray(result.events)) {
      return null
    }
    return {
      sessionId,
      meta: result.meta,
      events: result.events,
    }
  } catch (error) {
    console.warn('[Hookify] Failed to load session snapshot for', assetPath, error)
    return null
  }
}
