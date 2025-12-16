import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ChatDockPanel } from '~/components/chatbot/ChatDockPanel'
import type { ViewerChatState } from '~/features/viewer/viewer.loader'
import type { ChatMessageRecord } from '~/lib/sessions/model'
import type React from 'react'

const requestChatStream = vi.fn()
const fetchChatbotState = vi.fn()
const mutateMisalignmentStatus = vi.fn()

vi.mock('~/features/chatbot/chatbot.runtime', () => ({
  requestChatStream: (...args: unknown[]) => requestChatStream(...args),
}))

vi.mock('~/server/function/chatbotState', () => ({
  fetchChatbotState: (...args: unknown[]) => fetchChatbotState(...args),
}))

vi.mock('~/server/function/misalignments', () => ({
  mutateMisalignmentStatus: (...args: unknown[]) => mutateMisalignmentStatus(...args),
}))

const baseState: ViewerChatState = {
  sessionId: 'session-default',
  mode: 'session',
  featureEnabled: true,
  threadId: 'thread-default',
  threads: [
    {
      id: 'thread-default',
      title: 'Session Coach',
      status: 'active',
      messageCount: 0,
      mode: 'session',
    },
  ],
  snapshot: { sessionId: 'session-default', meta: undefined, events: [] } as any,
  misalignments: [],
  messages: [],
  contextSections: [{ id: 'meta', heading: 'Metadata' }],
  modelOptions: [
    {
      id: 'lmstudio:local-default',
      label: 'LM Studio Local',
      description: 'Local OpenAI-compatible mock',
      provider: 'LM Studio',
      contextWindow: 1000,
      maxOutputTokens: 500,
      tags: [],
      modes: ['session'],
    },
  ],
  initialModelId: 'lmstudio:local-default',
}

beforeEach(() => {
  requestChatStream.mockReset()
  fetchChatbotState.mockReset()
  fetchChatbotState.mockResolvedValue(baseState)
  mutateMisalignmentStatus.mockResolvedValue(undefined)
  if (typeof crypto === 'undefined' || !crypto.randomUUID) {
    vi.stubGlobal('crypto', { randomUUID: () => 'uuid' })
  }
})

function createStreamFromChunks(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return {
    getReader() {
      let index = 0
      return {
        read: vi.fn().mockImplementation(() => {
          if (index < chunks.length) {
            const value = encoder.encode(chunks[index])
            index += 1
            return Promise.resolve({ value, done: false })
          }
          return Promise.resolve({ done: true, value: undefined })
        }),
        releaseLock: vi.fn(),
      }
    },
  } as unknown as ReadableStream<Uint8Array>
}

function renderChatDockPanel(state: ViewerChatState = baseState, props: Partial<React.ComponentProps<typeof ChatDockPanel>> = {}) {
  const queryClient = new QueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <ChatDockPanel sessionId="session-default" state={state} {...props} />
    </QueryClientProvider>,
  )
}

describe('ChatDockPanel interactions', () => {
  it('sends a prompt via Enter key using the selected model', async () => {
    requestChatStream.mockResolvedValue(createStreamFromChunks(['LLM response']))
    renderChatDockPanel()
    const textarea = screen.getByPlaceholderText(/Summarize this session/i)
    await userEvent.type(textarea, 'Review current plan')
    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(requestChatStream).toHaveBeenCalled())
    expect(requestChatStream).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'lmstudio:local-default',
        prompt: 'Review current plan',
      }),
    )
  })

  it('requests a reset when clicking New chat', async () => {
    fetchChatbotState.mockResolvedValue({ ...baseState, messages: [] })
    renderChatDockPanel()
    const newChatButton = screen.getByRole('button', { name: /New chat/i })
    await userEvent.click(newChatButton)
    await waitFor(() => expect(fetchChatbotState).toHaveBeenCalled())
    expect(fetchChatbotState).toHaveBeenCalledWith({ data: { sessionId: 'session-default', mode: 'session', reset: true } })
  })

  it('renders evidence entries for assistant messages', () => {
    const assistantMessage: ChatMessageRecord = {
      id: 'assistant-1',
      sessionId: 'session-default',
      mode: 'session',
      role: 'assistant',
      content: 'Here is what I found.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      evidence: [
        { path: 'src/app.ts', ruleId: 'AGENT-001', snippet: 'TODO found', severity: 'high' },
      ],
    }
    const stateWithEvidence: ViewerChatState = {
      ...baseState,
      messages: [assistantMessage],
    }
    renderChatDockPanel(stateWithEvidence)
    expect(screen.getByText(/Evidence/i)).toBeInTheDocument()
    expect(screen.getByText(/AGENT-001/)).toBeInTheDocument()
  })
})
