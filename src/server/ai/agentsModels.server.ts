import { aisdk } from '@openai/agents-extensions'
import type { LanguageModel } from 'ai'
import { resolveLanguageModel } from '~/server/lib/aiRuntime'

export type AgentsModelId = string

export function getAgentsModel(modelId: AgentsModelId): { model: LanguageModel; modelId: string } {
  const { definition, model } = resolveLanguageModel(modelId)
  return { model: aisdk(model), modelId: definition.id }
}
