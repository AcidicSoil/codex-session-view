import type { ChatMode } from '~/lib/sessions/model'
import type { ChatModelDefinition, ChatModelOption, ProviderId } from '~/lib/ai/client.types'
import { getDefaultModelForMode } from '~/lib/ai/aiConfig'

const PROVIDER_LABELS: Record<ProviderId, string> = {
  'openai-compatible': 'OpenAI Compatible',
  'gemini-cli': 'Gemini CLI',
  'codex-cli': 'Codex CLI',
  'lm-studio': 'LM Studio',
}

const STATIC_MODEL_REGISTRY: Record<string, ChatModelDefinition> = {
  'lmstudio:local-default': {
    id: 'lmstudio:local-default',
    label: 'LM Studio Local',
    description: 'Runs against a local LM Studio OpenAI-compatible server for offline workflows.',
    providerId: 'lm-studio',
    providerModel: 'essentialai_rnj-1-instruct',
    contextWindow: 32768,
    maxOutputTokens: 8_192,
    defaultTemperature: 0.2,
    tags: ['local', 'open-source'],
    modes: ['session', 'general'],
  },
  'gemini:2.5-flash': {
    id: 'gemini:2.5-flash',
    label: 'Gemini 2.5 Flash',
    description: 'High-token streaming model via Gemini CLI for exploratory chats.',
    providerId: 'gemini-cli',
    providerModel: 'gemini-2.5-flash',
    contextWindow: 1_000_000,
    maxOutputTokens: 16_384,
    defaultTemperature: 0.2,
    tags: ['streaming', 'exploration'],
    modes: ['session', 'general'],
  },
  'gemini:2.5-pro': {
    id: 'gemini:2.5-pro',
    label: 'Gemini 2.5 pro',
    description: 'High-token streaming model via Gemini CLI for exploratory chats.',
    providerId: 'gemini-cli',
    providerModel: 'gemini-2.5-pro',
    contextWindow: 1_000_000,
    maxOutputTokens: 16_384,
    defaultTemperature: 0.2,
    tags: ['streaming', 'exploration'],
    modes: ['session', 'general'],
  },
  'codex:gpt-5.1-codex': {
    id: 'codex:gpt-5.1-codex',
    label: 'GPT-5.1 Codex',
    description: 'Full Codex CLI agent with approvals + sandbox controls for remediation coaching.',
    providerId: 'codex-cli',
    providerModel: 'gpt-5.1-codex',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    defaultTemperature: 0.1,
    tags: ['reasoning', 'tools'],
    modes: ['session', 'general'],
  },
  'codex:gpt-5.1-codex-max': {
    id: 'codex:gpt-5.1-codex-max',
    label: 'GPT-5.1 Codex Max',
    description: 'Maximum reasoning effort via Codex CLI; best for deep remediation walkthroughs.',
    providerId: 'codex-cli',
    providerModel: 'gpt-5.1-codex-max',
    contextWindow: 200_000,
    maxOutputTokens: 16_384,
    defaultTemperature: 0.15,
    tags: ['reasoning', 'slow'],
    modes: ['session', 'general'],
  },
}

const dynamicModelRegistry = new Map<string, ChatModelDefinition>()

const FALLBACK_MODEL_IDS: Record<ChatMode, string> = {
  session: 'lmstudio:local-default',
  general: 'lmstudio:local-default',
}

function listAllModelDefinitions() {
  return [...Object.values(STATIC_MODEL_REGISTRY), ...dynamicModelRegistry.values()]
}

function getOptionalModelDefinition(modelId: string) {
  return dynamicModelRegistry.get(modelId) ?? STATIC_MODEL_REGISTRY[modelId]
}

export function registerDynamicChatModels(
  definitions: ChatModelDefinition[],
  options?: { replaceProvider?: ProviderId },
) {
  if (options?.replaceProvider) {
    for (const [id, definition] of dynamicModelRegistry.entries()) {
      if (definition.providerId === options.replaceProvider) {
        dynamicModelRegistry.delete(id)
      }
    }
  }
  for (const definition of definitions) {
    dynamicModelRegistry.set(definition.id, definition)
  }
}

export function getChatModelDefinition(modelId: string): ChatModelDefinition {
  const definition = getOptionalModelDefinition(modelId)
  if (!definition) {
    throw new Error(`Unknown chat model: ${modelId}`)
  }
  return definition
}

export function getChatModelOptions(mode?: ChatMode): ChatModelOption[] {
  return listAllModelDefinitions()
    .filter((definition) => (mode ? definition.modes.includes(mode) : true))
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      description: definition.description,
      provider: PROVIDER_LABELS[definition.providerId],
      contextWindow: definition.contextWindow,
      maxOutputTokens: definition.maxOutputTokens,
      tags: definition.tags,
      modes: definition.modes,
    }))
    .sort((a, b) => a.provider.localeCompare(b.provider) || a.label.localeCompare(b.label))
}

export function resolveModelForMode(mode: ChatMode, requestedId?: string): string {
  if (!requestedId) {
    const configured = getDefaultModelForMode(mode)
    if (configured) {
      const definition = getOptionalModelDefinition(configured)
      if (definition && definition.modes.includes(mode)) {
        return configured
      }
    }
    const fallback =
      listAllModelDefinitions().find((definition) => definition.modes.includes(mode))?.id ??
      FALLBACK_MODEL_IDS[mode]
    const fallbackDefinition = fallback ? getOptionalModelDefinition(fallback) : null
    if (!fallback || !fallbackDefinition) {
      throw new Error(`No chat model registered for mode ${mode}`)
    }
    return fallback
  }
  const definition = getOptionalModelDefinition(requestedId)
  if (!definition) {
    throw new Error(`Unknown chat model: ${requestedId}`)
  }
  if (!definition.modes.includes(mode)) {
    throw new Error(`Model ${requestedId} is not available for ${mode} mode`)
  }
  return definition.id
}
