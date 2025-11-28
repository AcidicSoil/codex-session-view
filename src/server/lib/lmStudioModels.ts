import type { ChatModelDefinition } from '~/lib/ai/client'
import { registerDynamicChatModels } from '~/lib/ai/client'
import { logInfo, logWarn } from '~/lib/logger'

let lastSyncTimestamp = 0
let inflightSync: Promise<void> | null = null
const SYNC_TTL_MS = 60_000

export async function ensureLmStudioModelsRegistered(force = false) {
  const baseURL = (process.env.AI_LMSTUDIO_BASE_URL ?? 'http://127.0.0.1:1234/v1').replace(/\/+$/, '')
  if (!baseURL) return
  if (!force && Date.now() - lastSyncTimestamp < SYNC_TTL_MS) {
    return
  }
  if (inflightSync) {
    return inflightSync
  }
  inflightSync = syncLmStudioModels(baseURL)
  try {
    await inflightSync
  } finally {
    inflightSync = null
  }
}

async function syncLmStudioModels(baseURL: string) {
  const modelsEndpoint = `${baseURL}/models`
  const apiKey = process.env.AI_LMSTUDIO_API_KEY ?? 'lm-studio'
  try {
    const response = await fetch(modelsEndpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })
    if (!response.ok) {
      throw new Error(`LM Studio responded with status ${response.status}`)
    }
    const payload = (await response.json()) as { data?: Array<{ id: string; root?: string; context_length?: number }> }
    const entries = Array.isArray(payload.data) ? payload.data : []
    if (!entries.length) {
      registerDynamicChatModels([], { replaceProvider: 'lm-studio' })
      logInfo('lmstudio.models', 'LM Studio returned no models; cleared dynamic registry')
      lastSyncTimestamp = Date.now()
      return
    }
    const definitions: ChatModelDefinition[] = entries.map((entry) => ({
      id: `lmstudio:${entry.id}`,
      label: entry.id,
      description: `LM Studio local model (${entry.id})`,
      providerId: 'lm-studio',
      providerModel: entry.id,
      contextWindow: entry.context_length ?? 128_000,
      maxOutputTokens: Math.min(entry.context_length ?? 8_192, 16_384),
      defaultTemperature: 0.2,
      tags: ['local', 'lm-studio'],
      modes: ['session', 'general'],
    }))
    registerDynamicChatModels(definitions, { replaceProvider: 'lm-studio' })
    logInfo('lmstudio.models', 'Synced LM Studio models', { count: definitions.length })
    lastSyncTimestamp = Date.now()
  } catch (error) {
    logWarn('lmstudio.models', 'Failed to sync LM Studio models', {
      endpoint: modelsEndpoint,
      error: error instanceof Error ? error.message : error,
    })
  }
}
