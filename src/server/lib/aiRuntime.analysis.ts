import { generateText } from 'ai'
import { getChatModelDefinition, resolveModelForMode } from '~/lib/ai/client'
import { resolveProvider } from '~/server/lib/aiRuntime.providers'
import {
  HOOK_DISCOVERY_SYSTEM_PROMPT,
  SESSION_COMMITS_SYSTEM_PROMPT,
  SESSION_SUMMARY_SYSTEM_PROMPT,
} from '~/server/lib/aiRuntime.prompts'
import type { AnalysisOptions } from '~/server/lib/aiRuntime.types'

export async function generateSessionAnalysis(options: AnalysisOptions): Promise<string> {
  const modelId = resolveModelForMode(options.mode, options.modelId)
  const definition = getChatModelDefinition(modelId)

  const provider = resolveProvider(definition.providerId)
  let systemPrompt = ''
  switch (options.analysisType) {
    case 'summary':
      systemPrompt = SESSION_SUMMARY_SYSTEM_PROMPT
      break
    case 'commits':
      systemPrompt = SESSION_COMMITS_SYSTEM_PROMPT
      break
    case 'hook-discovery':
      systemPrompt = HOOK_DISCOVERY_SYSTEM_PROMPT
      break
  }

  const result = await generateText({
    model: provider(definition.providerModel),
    system: systemPrompt,
    messages: [{ role: 'user', content: `Session Context:\n${options.contextPrompt}` }],
    temperature: 0.2,
    maxOutputTokens: definition.maxOutputTokens,
  })

  return result.text
}
