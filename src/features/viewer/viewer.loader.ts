import type { LoaderFnContext } from '@tanstack/react-router'
import { logError, logInfo, logWarn } from '~/lib/logger'
import { runSessionDiscovery } from '~/server/function/sessionDiscovery'
import { fetchChatbotState } from '~/server/function/chatbotState'
import { collectRuleInventory } from '~/server/lib/ruleInventory'

let previousStats: { projectFiles: number; sessionAssets: number } | null = null

export async function viewerLoader(ctx: LoaderFnContext) {
  const environment = typeof window === 'undefined' ? 'server' : 'client'
  const trigger = ctx.cause ?? 'unknown'
  const loaderDeps = ctx.deps ?? {}
  const searchParams = ctx.location?.search ?? {}
  const sessionId = resolveSessionId(searchParams)
  logInfo('viewer.loader', 'Loader invoked', {
    environment,
    trigger,
    loaderDeps,
    searchParams,
    sessionId,
  })

  try {
    const snapshot = await runSessionDiscovery()
    logInfo('viewer.loader', 'Loader discovery completed', {
      environment,
      trigger,
      projectFilesCount: snapshot.projectFiles.length,
      sessionAssetsCount: snapshot.sessionAssets.length,
      sourceCounts: snapshot.stats,
      discoveryInputs: snapshot.inputs,
    })

    if (previousStats && previousStats.sessionAssets > 0 && snapshot.sessionAssets.length === 0) {
      logWarn('viewer.loader', 'Session assets dropped to zero after previous non-empty discovery', {
        previous: previousStats,
        next: {
          projectFiles: snapshot.projectFiles.length,
          sessionAssets: snapshot.sessionAssets.length,
        },
      })
    }

    previousStats = {
      projectFiles: snapshot.projectFiles.length,
      sessionAssets: snapshot.sessionAssets.length,
    }

    let sessionCoach: Awaited<ReturnType<typeof fetchChatbotState>> | null = null
    try {
      sessionCoach = await fetchChatbotState({ data: { sessionId, mode: 'session' } })
    } catch (chatbotError) {
      logWarn('viewer.loader', 'Chatbot state unavailable', {
        sessionId,
        error: chatbotError instanceof Error ? chatbotError.message : chatbotError,
      })
    }

    const ruleSheet = await collectRuleInventory()

    return {
      ...snapshot,
      sessionId,
      sessionCoach,
      ruleSheet,
    }
  } catch (error) {
    logError('viewer.loader', 'Failed to discover project assets', {
      error: error instanceof Error ? error.message : 'unknown',
      environment,
      trigger,
    })
    throw error
  }
}

export type ViewerSnapshot = Awaited<ReturnType<typeof viewerLoader>>
export type ViewerChatState = Awaited<ReturnType<typeof fetchChatbotState>>

function resolveSessionId(search: Record<string, unknown>) {
  const fromSearch = typeof search?.sessionId === 'string' ? search.sessionId : null
  return fromSearch && fromSearch.trim().length > 0 ? fromSearch : 'demo-session'
}
