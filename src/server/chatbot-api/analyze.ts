import { buildChatContext } from '~/features/chatbot/context-builder'
import { logError, logInfo, logWarn } from '~/lib/logger'
import {
  resolveModelForMode,
  getChatModelDefinition,
  generateSessionSummaryMarkdown,
  generateCommitMessages,
} from '~/lib/ai/client'
import {
  loadAgentRules,
  loadSessionSnapshot,
  SessionSnapshotUnavailableError,
} from '~/server/lib/chatbotData.server'
import { generateSessionAnalysis } from '~/server/lib/aiRuntime'
import { getSessionRepoBinding } from '~/server/persistence/sessionRepoBindings'
import { getActiveChatThread } from '~/server/persistence/chatThreads.server'
import { listChatMessages } from '~/server/persistence/chatMessages.server'
import { listMisalignments } from '~/server/persistence/misalignments'
import { jsonResponse } from '~/server/chatbot-api/response'
import { getProviderErrorMessage, isAiProviderError, isProviderUnavailableError } from '~/server/chatbot-api/errors'
import type { AnalyzeInput } from '~/server/chatbot-api/schema'

export async function handleAnalyzeChat(input: AnalyzeInput, startedAt: number) {
  try {
    const repoBinding = getSessionRepoBinding(input.sessionId)
    if (!repoBinding) {
      logWarn('chatbot.analyze', 'Session lacks repo binding; cannot run Hook Discovery', {
        sessionId: input.sessionId,
        analysisType: input.analysisType,
      })
      return jsonResponse(
        {
          code: 'REPO_CONTEXT_REQUIRED',
          message:
            'Bind a session asset with repository metadata before running Session Intelligence analysis.',
        },
        422
      )
    }

    const resolvedModelId = resolveModelForMode(input.mode)
    const modelDefinition = getChatModelDefinition(resolvedModelId)

    const snapshot = await loadSessionSnapshot(input.sessionId, { requireAsset: true })
    const rules = await loadAgentRules(repoBinding.rootDir)
    const misalignments = await listMisalignments(input.sessionId)
    const activeThread = await getActiveChatThread(input.sessionId, input.mode)
    const history = await listChatMessages(input.sessionId, input.mode, activeThread.id)
    const context = buildChatContext({
      snapshot,
      misalignments,
      agentRules: rules,
      history,
      providerOverrides: {
        maxContextTokens: modelDefinition.contextWindow,
        maxOutputTokens: modelDefinition.maxOutputTokens,
      },
    })

    const baseMeta = {
      sessionId: input.sessionId,
      mode: input.mode,
      analysisType: input.analysisType,
      modelId:
        input.analysisType === 'hook-discovery'
          ? resolvedModelId
          : 'builtin:session-insights',
      repoRoot: repoBinding.rootDir,
      assetPath: repoBinding.assetPath,
    }

    const contextHeadings = context.sections.map((section) => section.heading)

    if (input.analysisType === 'summary') {
      const summaryMarkdown = generateSessionSummaryMarkdown({
        snapshot,
        misalignments,
        recentEvents: snapshot.events,
        contextHeadings,
        promptSummary: input.prompt,
      })

      logInfo('chatbot.analyze', 'Analyze request processed', {
        ...baseMeta,
        durationMs: Date.now() - startedAt,
        success: true,
      })
      return jsonResponse({ summaryMarkdown })
    }

    if (input.analysisType === 'commits') {
      const commitMessages = generateCommitMessages({
        snapshot,
        misalignments,
        recentEvents: snapshot.events,
      })

      logInfo('chatbot.analyze', 'Analyze request processed', {
        ...baseMeta,
        commitCount: commitMessages.length,
        durationMs: Date.now() - startedAt,
        success: true,
      })
      return jsonResponse({ commitMessages })
    }

    const resultText = await generateSessionAnalysis({
      history,
      contextPrompt: context.prompt,
      analysisType: input.analysisType,
      modelId: resolvedModelId,
      mode: input.mode,
    })

    logInfo('chatbot.analyze', 'Analyze request processed', {
      ...baseMeta,
      durationMs: Date.now() - startedAt,
      success: true,
    })
    return jsonResponse({ summaryMarkdown: resultText })
  } catch (error) {
    if (error instanceof SessionSnapshotUnavailableError) {
      logWarn('chatbot.analyze', 'Session snapshot unavailable', {
        sessionId: input.sessionId,
        mode: input.mode,
        analysisType: input.analysisType,
        durationMs: Date.now() - startedAt,
        error: error.message,
        success: false,
      })
      return jsonResponse(
        {
          code: 'SESSION_CONTEXT_UNAVAILABLE',
          message: error.message,
        },
        422
      )
    }
    if (isProviderUnavailableError(error) || isAiProviderError(error)) {
      const message = getProviderErrorMessage(error)
      logWarn('chatbot.analyze', 'Analyze provider unavailable', {
        sessionId: input.sessionId,
        mode: input.mode,
        analysisType: input.analysisType,
        durationMs: Date.now() - startedAt,
        error: message,
        success: false,
      })
      return jsonResponse(
        {
          code: 'MODEL_UNAVAILABLE',
          message,
        },
        503
      )
    }

    logError('chatbot.analyze', 'Analyze request failed', {
      sessionId: input.sessionId,
      mode: input.mode,
      analysisType: input.analysisType,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : error,
      success: false,
    })
    throw error
  }
}
