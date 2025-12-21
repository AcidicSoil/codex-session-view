import {
  streamText,
  type LanguageModel,
  type ToolSet,
} from 'ai'
import type { ProviderId } from '~/lib/ai/client'
import type { ChatMessageRecord } from '~/lib/sessions/model'
import { getChatModelDefinition, resolveModelForMode } from '~/lib/ai/client'
import { resolveProvider } from '~/server/lib/aiRuntime.providers'
import {
  buildGeneralSystemPrompt,
  buildSessionCoachSystemPrompt,
} from '~/server/lib/aiRuntime.prompts'
import { toCoreMessages } from '~/server/lib/aiRuntime.messages'
import type {
  AnalysisOptions,
  ChatStreamResult,
  GeneralChatOptions,
  SessionCoachReplyOptions,
} from '~/server/lib/aiRuntime.types'
import { generateSessionAnalysis } from '~/server/lib/aiRuntime.analysis'

export class ProviderUnavailableError extends Error {
  code = 'MODEL_UNAVAILABLE' as const
  providerId: ProviderId

  constructor(providerId: ProviderId, message: string, public cause?: unknown) {
    super(message)
    this.providerId = providerId
  }
}

export function generateSessionCoachReply<TOOLS extends ToolSet = ToolSet>(
  options: SessionCoachReplyOptions<TOOLS>,
): ChatStreamResult<TOOLS> {
  const modelId = resolveModelForMode('session', options.modelId)
  const definition = getChatModelDefinition(modelId)
  const provider = resolveProvider(definition.providerId)
  const result = streamText({
    model: provider(definition.providerModel),
    system: buildSessionCoachSystemPrompt(options.contextPrompt, options.metadata),
    messages: toCoreMessages(options.history),
    temperature: definition.defaultTemperature,
    maxOutputTokens: definition.maxOutputTokens,
    tools: options.tools,
    experimental_context: options.toolContext,
  })
  return {
    definition,
    textStream: result.textStream,
    fullStream: result.fullStream,
    usage: result.usage,
    totalUsage: result.totalUsage,
    finishReason: result.finishReason,
  }
}

export function runGeneralChatTurn(options: GeneralChatOptions): ChatStreamResult {
  const modelId = resolveModelForMode('general', options.modelId)
  const definition = getChatModelDefinition(modelId)
  const provider = resolveProvider(definition.providerId)
  const result = streamText({
    model: provider(definition.providerModel),
    system: buildGeneralSystemPrompt(),
    messages: toCoreMessages(options.history),
    temperature: definition.defaultTemperature,
    maxOutputTokens: definition.maxOutputTokens,
  })
  return {
    definition,
    textStream: result.textStream,
    fullStream: result.fullStream,
    usage: result.usage,
    totalUsage: result.totalUsage,
    finishReason: result.finishReason,
  }
}

export { generateSessionAnalysis }
export type {
  AnalysisOptions,
  ChatStreamResult,
  GeneralChatOptions,
  SessionCoachReplyOptions,
}
