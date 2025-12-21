import type { ChatMode, MisalignmentRecord, SessionSnapshot } from '~/lib/sessions/model'
import type { ResponseItemParsed } from '~/lib/session-parser'

export interface AIProviderConfig {
  model: string
  maxContextTokens: number
  maxOutputTokens: number
  temperature: number
  topP: number
  stream: boolean
}

export interface PromptSection {
  id: string
  heading: string
  content: string
}

export interface SummaryGeneratorOptions {
  snapshot: SessionSnapshot
  misalignments?: MisalignmentRecord[]
  recentEvents?: ResponseItemParsed[]
  contextHeadings?: string[]
  promptSummary?: string
}

export interface CommitMessageGeneratorOptions extends SummaryGeneratorOptions {
  maxCommits?: number
}

export type ProviderId = 'openai-compatible' | 'gemini-cli' | 'codex-cli' | 'lm-studio'

export interface ChatModelDefinition {
  id: string
  label: string
  description: string
  providerId: ProviderId
  providerModel: string
  contextWindow: number
  maxOutputTokens: number
  defaultTemperature: number
  tags: string[]
  modes: ChatMode[]
}

export interface ChatModelOption {
  id: string
  label: string
  description: string
  provider: string
  contextWindow: number
  maxOutputTokens: number
  tags: string[]
  modes: ChatMode[]
}
