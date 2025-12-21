import type { AIProviderConfig } from '~/lib/ai/client.types'

const DEFAULT_MODEL =
  readEnvValue('AI_SESSION_DEFAULT_MODEL') ?? readEnvValue('AI_MODEL') ?? 'internlm_januscoderv-7b'
const DEFAULT_CONTEXT = Number(readEnvValue('AI_MAX_CONTEXT') ?? 32768)
const DEFAULT_OUTPUT = Number(readEnvValue('AI_MAX_OUTPUT') ?? 6144)

function readEnvValue(key: string) {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

function readServerEnv(key: string) {
  return readEnvValue(key)
}

export function getAiProviderConfig(overrides: Partial<AIProviderConfig> = {}): AIProviderConfig {
  return {
    model: overrides.model ?? DEFAULT_MODEL,
    maxContextTokens: overrides.maxContextTokens ?? DEFAULT_CONTEXT,
    maxOutputTokens: overrides.maxOutputTokens ?? DEFAULT_OUTPUT,
    temperature: overrides.temperature ?? 0,
    topP: overrides.topP ?? 1,
    stream: overrides.stream ?? true,
  }
}

export function getDefaultModelForMode(mode: 'session' | 'general') {
  const configured =
    mode === 'session'
      ? readServerEnv('AI_SESSION_DEFAULT_MODEL') ?? process.env.AI_SESSION_DEFAULT_MODEL
      : readServerEnv('AI_GENERAL_DEFAULT_MODEL') ?? process.env.AI_GENERAL_DEFAULT_MODEL
  if (configured) {
    return configured
  }
  return null
}

export function estimateTokenCount(text: string) {
  if (!text) return 0
  return Math.ceil(text.length / 4)
}
