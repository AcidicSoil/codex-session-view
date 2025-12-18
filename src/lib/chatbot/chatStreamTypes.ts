import type { ChatEventReference } from '~/lib/sessions/model'

export type ChatStreamChunk =
  | { kind: 'start' }
  | { kind: 'text-delta'; text: string }
  | { kind: 'tool-call'; toolCallId: string; toolName: string; input: unknown; providerExecuted?: boolean; dynamic?: boolean }
  | {
      kind: 'tool-result'
      toolCallId: string
      toolName: string
      output: unknown
      providerExecuted?: boolean
      dynamic?: boolean
      contextEvents?: ChatEventReference[]
    }
  | { kind: 'tool-error'; toolCallId: string; toolName: string; error: string; providerExecuted?: boolean; dynamic?: boolean }
  | { kind: 'done'; text: string }
  | { kind: 'error'; message: string }
