import type { ChatEventReference } from '~/lib/sessions/model'

export type ChatStreamChunk =
  | { type: 'start' }
  | { type: 'text-delta'; value: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; input: unknown; providerExecuted?: boolean; dynamic?: boolean }
  | {
      type: 'tool-result'
      toolCallId: string
      toolName: string
      output: unknown
      providerExecuted?: boolean
      dynamic?: boolean
      contextEvents?: ChatEventReference[]
    }
  | { type: 'tool-error'; toolCallId: string; toolName: string; error: string; providerExecuted?: boolean; dynamic?: boolean }
  | { type: 'done' }
  | { type: 'error'; message: string }

export interface StreamingToolCall {
  toolCallId: string
  toolName: string
  input: unknown
  providerExecuted?: boolean
  dynamic?: boolean
  status: 'pending' | 'executing' | 'succeeded' | 'failed'
  output?: unknown
  error?: string
  contextEvents?: ChatEventReference[]
}
