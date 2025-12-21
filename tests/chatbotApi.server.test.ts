import { beforeEach, describe, expect, it, vi } from 'vitest'
import { analyzeChatFromPayload, streamChatFromPayload } from '~/server/chatbot-api.server'

const handleSessionChatStream = vi.fn()
const handleGeneralChatStream = vi.fn()
const handleAnalyzeChat = vi.fn()
const resolveActiveThreadId = vi.fn().mockResolvedValue('thread-default')

vi.mock('~/server/chatbot-api/stream', () => ({
  handleSessionChatStream: (...args: unknown[]) => handleSessionChatStream(...args),
  handleGeneralChatStream: (...args: unknown[]) => handleGeneralChatStream(...args),
}))

vi.mock('~/server/chatbot-api/analyze', () => ({
  handleAnalyzeChat: (...args: unknown[]) => handleAnalyzeChat(...args),
}))

vi.mock('~/server/chatbot-api/threads', () => ({
  resolveActiveThreadId: (...args: unknown[]) => resolveActiveThreadId(...args),
}))

vi.mock('~/server/lib/lmStudioModels', () => ({
  ensureLmStudioModelsRegistered: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('~/features/chatbot/chatModeConfig', () => ({
  assertChatModeEnabled: vi.fn(),
}))

vi.mock('~/lib/ai/client', async () => {
  const actual = await vi.importActual<typeof import('~/lib/ai/client')>('~/lib/ai/client')
  return {
    ...actual,
    resolveModelForMode: vi.fn(() => 'lmstudio:local-default'),
  }
})

describe('chatbot API handlers', () => {
  beforeEach(() => {
    handleSessionChatStream.mockReset()
    handleGeneralChatStream.mockReset()
    handleAnalyzeChat.mockReset()
    resolveActiveThreadId.mockClear()
  })

  it('returns summary markdown for analyze payloads', async () => {
    handleAnalyzeChat.mockResolvedValue(
      new Response(JSON.stringify({ summaryMarkdown: '## Goals\n- Summary' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    const response = await analyzeChatFromPayload({
      sessionId: 'session-default',
      mode: 'session',
      analysisType: 'summary',
    })

    expect(response.status).toBe(200)
    const payload = await response.json()
    expect(payload.summaryMarkdown).toContain('## Goals')
  })

  it('streams assistant text for session prompts', async () => {
    handleSessionChatStream.mockResolvedValue(
      new Response('Session coach reply from mocked provider.', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
    )

    const response = await streamChatFromPayload({
      sessionId: 'session-default',
      mode: 'session',
      prompt: 'Summarize the session in one sentence.',
    })

    expect(resolveActiveThreadId).toHaveBeenCalledWith('session-default', 'session', undefined)
    expect(handleSessionChatStream).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session-default',
        prompt: 'Summarize the session in one sentence.',
        modelId: 'lmstudio:local-default',
        threadId: 'thread-default',
      }),
    )

    const body = await response.text()
    expect(body.length).toBeGreaterThan(0)
  })
})
