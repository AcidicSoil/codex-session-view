import type { ChatEventReference, ChatMessageRecord } from '~/lib/sessions/model'

export type ToolCallState = {
  toolCallId: string
  toolName: string
  input: unknown
  providerExecuted?: boolean
  dynamic?: boolean
  status: 'pending' | 'executing' | 'succeeded' | 'failed'
  result?: unknown
  error?: string
  contextEvents?: ChatEventReference[]
}

export interface ChatStreamEnvelope {
  kind: 'text-delta' | 'tool-call' | 'tool-result' | 'tool-error' | 'done'
  text?: string
  toolCall?: ToolCallState
  toolResult?: ToolCallState
  toolError?: ToolCallState
}

export interface ChatStreamPersistedState {
  contextEvents?: ChatEventReference[]
  assistantMessage?: ChatMessageRecord
}
