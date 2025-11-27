import { simulateReadableStream, streamText, type AsyncIterableStream, type CoreMessage, type FinishReason, type LanguageModel, type LanguageModelUsage } from 'ai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { ChatMessageRecord } from '~/lib/sessions/model'
import type { ChatRemediationMetadata } from '~/lib/chatbot/types'
import {
  getChatModelDefinition,
  resolveModelForMode,
  type ChatModelDefinition,
  type ProviderId,
} from '~/lib/ai/client'

export interface ChatStreamResult {
  definition: ChatModelDefinition
  textStream: AsyncIterableStream<string>
  usage: Promise<LanguageModelUsage>
  totalUsage: Promise<LanguageModelUsage>
  finishReason: Promise<FinishReason>
}

export interface SessionCoachReplyOptions {
  history: ChatMessageRecord[]
  contextPrompt: string
  metadata?: ChatRemediationMetadata
  modelId?: string
}

export interface GeneralChatOptions {
  history: ChatMessageRecord[]
  modelId?: string
}

type ProviderFactory = () => (modelName: string, settings?: Record<string, unknown>) => LanguageModel

const providerFactories: Record<ProviderId, ProviderFactory> = {
  'openai-compatible': () => {
    const apiKey = readEnvValue('AI_OPENAI_COMPATIBLE_API_KEY') ?? readEnvValue('OPENAI_API_KEY');
    if (!apiKey) {
      throw new Error(
        'Missing AI_OPENAI_COMPATIBLE_API_KEY or OPENAI_API_KEY for openai-compatible models.'
      );
    }
    const baseURL =
      readEnvValue('AI_OPENAI_COMPATIBLE_BASE_URL') ??
      'https://api.openai.com/v1' ??
      'http://127.0.0.1:1234/v1';
    return createOpenAICompatible({
      name: 'openai-compatible',
      baseURL,
      apiKey,
    });
  },
  'gemini-cli': () => {
    const apiKey = readEnvValue('GEMINI_API_KEY') ?? readEnvValue('GOOGLE_GENERATIVE_AI_API_KEY');
    return createGoogleGenerativeAI({
      apiKey,
      name: 'google-generative-ai',
    });
  },
  demo: () => {
    return () => {
      throw new Error('Demo provider does not support direct streaming calls');
    };
  },
  'lm-studio': () => {
    const baseURL = readEnvValue('AI_LMSTUDIO_BASE_URL') ?? 'http://localhost:1234/v1';
    const apiKey = readEnvValue('AI_LMSTUDIO_API_KEY') ?? 'lm-studio';
    return createOpenAICompatible({
      name: 'lm-tudio',
      baseURL,
      apiKey,
    });
  },
};

const providerCache = new Map<ProviderId, ReturnType<ProviderFactory>>()

export function generateSessionCoachReply(options: SessionCoachReplyOptions): ChatStreamResult {
  const modelId = resolveModelForMode('session', options.modelId)
  const definition = getChatModelDefinition(modelId)
  if (definition.providerId === 'demo') {
    const latestPrompt = extractLatestUserPrompt(options.history)
    return createDemoChatResult(definition, {
      headline: `Demo coach response: ${latestPrompt || 'Awaiting prompt.'}`,
      details: [
        options.metadata?.ruleId ? `Focusing on rule ${options.metadata.ruleId}.` : 'No specific rule selected.',
        options.contextPrompt ? `Context digest: ${options.contextPrompt.slice(0, 220)}` : 'Context unavailable.',
      ],
    })
  }
  const provider = resolveProvider(definition.providerId)
  const result = streamText({
    model: provider(definition.providerModel),
    system: buildSessionCoachSystemPrompt(options.contextPrompt, options.metadata),
    messages: toCoreMessages(options.history),
    temperature: definition.defaultTemperature,
    maxOutputTokens: definition.maxOutputTokens,
  })
  return {
    definition,
    textStream: result.textStream,
    usage: result.usage,
    totalUsage: result.totalUsage,
    finishReason: result.finishReason,
  }
}

export function runGeneralChatTurn(options: GeneralChatOptions): ChatStreamResult {
  const modelId = resolveModelForMode('general', options.modelId)
  const definition = getChatModelDefinition(modelId)
  if (definition.providerId === 'demo') {
    const latestPrompt = extractLatestUserPrompt(options.history)
    return createDemoChatResult(definition, {
      headline: `Demo general reply: ${latestPrompt || 'Ask me anything.'}`,
      details: ['This offline-safe model echoes prompts to keep CI deterministic.'],
    })
  }
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
    usage: result.usage,
    totalUsage: result.totalUsage,
    finishReason: result.finishReason,
  }
}

function resolveProvider(providerId: ProviderId) {
  const cached = providerCache.get(providerId)
  if (cached) {
    return cached
  }
  const factory = providerFactories[providerId]
  if (!factory) {
    throw new Error(`Unsupported provider: ${providerId}`)
  }
  const instance = factory()
  providerCache.set(providerId, instance)
  return instance
}

function toCoreMessages(history: ChatMessageRecord[]): CoreMessage[] {
  return [...history]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((message) => ({
      role: message.role,
      content: message.content,
    })) as CoreMessage[]
}

function buildSessionCoachSystemPrompt(contextPrompt: string, metadata?: ChatRemediationMetadata) {
  const focusLine = metadata
    ? `Primary remediation target: rule ${metadata.ruleId ?? 'unspecified'} (${metadata.severity ?? 'unspecified'}).`
    : null
  return [
    'You are Codex Session Coach, a senior reviewer ensuring AGENTS alignment in code execution sessions.',
    'Offer structured, actionable remediation steps grounded in the provided context. Reference AGENT rules, misalignments, and evidence when available. Prefer concise paragraphs with bullet lists for next actions.',
    focusLine,
    'Session context (treat as authoritative):',
    contextPrompt.trim(),
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildGeneralSystemPrompt() {
  return 'You are Codex General Research assistant. Provide conversational yet concise answers, cite relevant files or rules when known, and ask clarifying questions when context is insufficient.'
}

function createDemoChatResult(definition: ChatModelDefinition, payload: { headline: string; details: string[] }): ChatStreamResult {
  const text = [payload.headline, ...payload.details.filter(Boolean)].join('\n\n')
  const textStream = createDemoTextStream(text)
  const usage: LanguageModelUsage = {
    inputTokens: text.length,
    outputTokens: text.length,
    totalTokens: text.length,
  }
  return {
    definition,
    textStream,
    usage: Promise.resolve(usage),
    totalUsage: Promise.resolve(usage),
    finishReason: Promise.resolve('stop' as FinishReason),
  }
}

function createDemoTextStream(text: string): AsyncIterableStream<string> {
  const chunkSize = 25
  const tokens = text.split(/\s+/)
  const chunks: string[] = []
  for (let index = 0; index < tokens.length; index += chunkSize) {
    chunks.push(tokens.slice(index, index + chunkSize).join(' '))
  }
  const stream = simulateReadableStream<string>({ chunks, chunkDelayInMs: 5, initialDelayInMs: 5 })
  return Object.assign(stream, {
    async *[Symbol.asyncIterator]() {
      const reader = stream.getReader()
      try {
        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          if (value) {
            yield value
          }
        }
      } finally {
        reader.releaseLock()
      }
    },
  })
}

function extractLatestUserPrompt(history: ChatMessageRecord[]) {
  const latest = [...history].reverse().find((message) => message.role === 'user')
  return latest?.content ?? ''
}

function readEnvValue(key: string) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}
