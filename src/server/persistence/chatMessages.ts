import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import {
  createChatMessageRecord,
  type ChatMessageEvidence,
  type ChatMessageRecord,
  type ChatMode,
  type SessionId,
} from '~/lib/sessions/model'

const chatMessagesCollection = createCollection(
  localOnlyCollectionOptions<ChatMessageRecord>({
    id: 'chat-messages-store',
    getKey: (record) => record.id,
  }),
)

export async function listChatMessages(sessionId: SessionId, mode: ChatMode): Promise<ChatMessageRecord[]> {
  return chatMessagesCollection.toArray
    .filter((record) => record.sessionId === sessionId && record.mode === mode)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function appendChatMessage(input: {
  sessionId: SessionId
  mode: ChatMode
  role: ChatMessageRecord['role']
  content: string
  misalignmentId?: string
  clientMessageId?: string
  evidence?: ChatMessageEvidence[]
}) {
  const dedupeKey = input.clientMessageId
  if (dedupeKey) {
    const existing = chatMessagesCollection.toArray.find(
      (record) => record.sessionId === input.sessionId && record.clientMessageId === dedupeKey,
    )
    if (existing) {
      return existing
    }
  }
  const record = createChatMessageRecord(input)
  await chatMessagesCollection.insert(record)
  return record
}

export async function resetChatThread(sessionId: SessionId, mode: ChatMode) {
  const matches = chatMessagesCollection.toArray.filter((record) => record.sessionId === sessionId && record.mode === mode)
  for (const record of matches) {
    await chatMessagesCollection.delete(record.id)
  }
}

export async function updateChatMessage(id: string, apply: (draft: ChatMessageRecord) => void) {
  const existing = chatMessagesCollection.get(id)
  if (!existing) {
    throw new Error(`Chat message ${id} not found`)
  }
  await chatMessagesCollection.update(id, (draft) => {
    apply(draft)
    draft.updatedAt = new Date().toISOString()
  })
  const refreshed = chatMessagesCollection.get(id)
  if (!refreshed) {
    throw new Error(`Chat message ${id} not found after update`)
  }
  return refreshed
}

export function getChatMessagesCollection() {
  return chatMessagesCollection
}

export async function clearChatMessages() {
  for (const record of chatMessagesCollection.toArray) {
    await chatMessagesCollection.delete(record.id)
  }
}
