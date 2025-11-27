import type { ChatMode } from '~/lib/sessions/model'
import type { ChatRemediationMetadata } from '~/lib/chatbot/types'

export interface ChatStreamRequestBody {
  sessionId: string
  mode: ChatMode
  prompt: string
  clientMessageId?: string
  metadata?: ChatRemediationMetadata
  modelId?: string
}

export interface ChatAnalyzeRequestBody {
  sessionId: string
  mode: ChatMode
  analysisType: 'summary' | 'commits'
  prompt?: string
}

export async function requestChatStream(body: ChatStreamRequestBody) {
  const response = await fetch('/api/chatbot/stream', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Chat stream failed with status ${response.status}`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = await response.json()
    const error = new Error('Chat mode unavailable') as Error & { code?: string }
    if (payload && typeof payload === 'object' && 'code' in payload) {
      error.code = (payload as { code?: string }).code
    }
    throw error
  }
  return response.body
}

export async function requestChatAnalysis<T = unknown>(body: ChatAnalyzeRequestBody) {
  const response = await fetch('/api/chatbot/analyze', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    throw new Error(`Analyze request failed with status ${response.status}`)
  }
  return (await response.json()) as T
}
