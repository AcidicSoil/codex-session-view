import type { CoreMessage } from 'ai'
import type { ChatMessageRecord } from '~/lib/sessions/model'

export function toCoreMessages(history: ChatMessageRecord[]): CoreMessage[] {
  return [...history]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((message) => ({
      role: message.role,
      content: message.content,
    })) as CoreMessage[]
}
