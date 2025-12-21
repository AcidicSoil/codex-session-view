import type { FinishReason, LanguageModelUsage, TextStreamPart, ToolSet } from 'ai'
import type { ChatMessageRecord } from '~/lib/sessions/model'
import type { ChatRemediationMetadata } from '~/lib/chatbot/types'
import type { ChatModelDefinition } from '~/lib/ai/client'

export interface ChatStreamResult<TOOLS extends ToolSet = ToolSet> {
  definition: ChatModelDefinition
  textStream: AsyncIterable<string>
  fullStream: AsyncIterable<TextStreamPart<TOOLS>>
  usage: Promise<LanguageModelUsage>
  totalUsage: Promise<LanguageModelUsage>
  finishReason: Promise<FinishReason>
}

export interface SessionCoachReplyOptions<TOOLS extends ToolSet = ToolSet> {
  history: ChatMessageRecord[]
  contextPrompt: string
  metadata?: ChatRemediationMetadata
  modelId?: string
  tools?: TOOLS
  toolContext?: unknown
}

export interface GeneralChatOptions {
  history: ChatMessageRecord[]
  modelId?: string
}

export interface AnalysisOptions {
  history: ChatMessageRecord[]
  contextPrompt: string
  analysisType: 'summary' | 'commits' | 'hook-discovery'
  modelId?: string
  mode: 'session' | 'general'
}
