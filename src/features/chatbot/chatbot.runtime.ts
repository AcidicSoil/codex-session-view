import type { ChatMode } from '~/lib/sessions/model'
import type { ChatRemediationMetadata } from '~/lib/chatbot/types'
import { streamChat } from '~/server/function/chatbotStream'
import { analyzeChat } from '~/server/function/chatbotAnalyze'

export interface ChatStreamRequestBody {
  sessionId: string
  mode: ChatMode
  prompt: string
  clientMessageId?: string
  metadata?: ChatRemediationMetadata
  modelId?: string
  threadId?: string
}

export interface ChatAnalyzeRequestBody {
  sessionId: string
  mode: ChatMode
  analysisType: 'summary' | 'commits' | 'hook-discovery'
  prompt?: string
}

export async function requestChatStream(body: ChatStreamRequestBody) {
  const response = await streamChat({ data: body })
  if (!(response instanceof Response)) {
    throw new Error('Chat stream request failed to return a response.')
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!response.ok) {
    const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null
    const error = new Error(
      payload && typeof payload === 'object' && typeof (payload as { message?: string }).message === 'string'
        ? (payload as { message: string }).message
        : `Chat stream failed with status ${response.status}`,
    ) as Error & { code?: string }
    const code = payload && typeof payload === 'object' && 'code' in payload ? (payload as { code?: string }).code : undefined
    if (code) {
      error.code = code
    }
    throw error
  }
  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(
      typeof (payload as { message?: string }).message === 'string'
        ? (payload as { message: string }).message
        : 'Chat mode unavailable',
    ) as Error & { code?: string }
    const code = typeof (payload as { code?: string }).code === 'string' ? (payload as { code: string }).code : undefined
    if (code) {
      error.code = code
    }
    throw error
  }
  return response.body
}

export async function requestChatAnalysis<T = unknown>(body: ChatAnalyzeRequestBody) {
  const response = await analyzeChat({ data: body })
  if (!(response instanceof Response)) {
    throw new Error('Analyze request failed to return a response.')
  }
  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? ''
    const payload = contentType.includes('application/json') ? await response.json().catch(() => null) : null
    const message =
      (payload && typeof payload === 'object' && typeof (payload as { message?: string }).message === 'string'
        ? (payload as { message: string }).message
        : null) ?? `Analyze request failed with status ${response.status}`
    const error = new Error(message) as Error & { code?: string }
    const code = payload && typeof payload === 'object' && typeof (payload as { code?: string }).code === 'string'
      ? (payload as { code: string }).code
      : undefined
    if (code) {
      error.code = code
    }
    throw error
  }
  return (await response.json()) as T
}
