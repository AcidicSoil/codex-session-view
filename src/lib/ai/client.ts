import type { AIProviderConfig, ChatModelDefinition, ChatModelOption, CommitMessageGeneratorOptions, PromptSection, SummaryGeneratorOptions } from '~/lib/ai/client.types'
import { getAiProviderConfig, getDefaultModelForMode, estimateTokenCount } from '~/lib/ai/aiConfig'
import { buildPrompt, generateCommitMessages, generateSessionSummaryMarkdown } from '~/lib/ai/client.summaries'
import { getChatModelDefinition, getChatModelOptions, registerDynamicChatModels, resolveModelForMode } from '~/lib/ai/client.models'

export type {
  AIProviderConfig,
  PromptSection,
  SummaryGeneratorOptions,
  CommitMessageGeneratorOptions,
  ChatModelDefinition,
  ChatModelOption,
} from '~/lib/ai/client.types'

export type ProviderId = import('~/lib/ai/client.types').ProviderId

export {
  getAiProviderConfig,
  getDefaultModelForMode,
  estimateTokenCount,
  buildPrompt,
  generateSessionSummaryMarkdown,
  generateCommitMessages,
  getChatModelDefinition,
  getChatModelOptions,
  registerDynamicChatModels,
  resolveModelForMode,
}
