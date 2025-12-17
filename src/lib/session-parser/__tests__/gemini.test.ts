import { describe, it, expect } from 'vitest'
import { tryParseGeminiConversationBlob, normalizeGeminiEventShape } from '../gemini'
import { ResponseItemSchema } from '../schemas'

function makeConversationJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    sessionId: 'session-123',
    projectHash: 'abc123',
    startTime: '2025-01-01T00:00:00Z',
    lastUpdated: '2025-01-01T00:10:00Z',
    messages: [
      {
        id: 'm1',
        type: 'user',
        timestamp: '2025-01-01T00:00:00Z',
        content: 'hello',
      },
      {
        id: 'm2',
        type: 'gemini',
        timestamp: '2025-01-01T00:00:05Z',
        content: 'Hi there',
        toolCalls: [
          {
            id: 'tool-1',
            name: 'shell',
            args: { command: 'ls' },
            result: { stdout: 'file.txt', exitCode: 0 },
          },
        ],
      },
    ],
    ...overrides,
  })
}

describe('Gemini parser helpers', () => {
  it('parses conversation JSON with messages and tools', async () => {
    const blob = makeMockBlob(makeConversationJson())
    const result = await tryParseGeminiConversationBlob(blob)
    expect(result).not.toBeNull()
    expect(result?.meta.timestamp).toBe('2025-01-01T00:00:00Z')
    expect(result?.events.length).toBe(3)
    const shellEvent = result?.events.find((ev) => ev.type === 'LocalShellCall') as any
    expect(shellEvent?.command).toBe('ls')
    expect(shellEvent?.stdout).toBe('file.txt')
    expect(shellEvent?.exitCode).toBe(0)
  })

  it('parses checkpoint format arrays', async () => {
    const blob = makeMockBlob(JSON.stringify([
      { id: 'c1', role: 'user', parts: [{ text: 'hello' }] },
      { id: 'c2', role: 'assistant', parts: [{ text: 'reply' }] },
    ]))
    const result = await tryParseGeminiConversationBlob(blob)
    expect(result).not.toBeNull()
    expect(result?.events.length).toBe(2)
  })

  it('normalizes tool_use events', () => {
    const raw = {
      type: 'tool_use',
      tool_name: 'shell',
      tool_id: 'call-123',
      parameters: { command: 'pwd' },
    }
    const normalized = normalizeGeminiEventShape(raw, raw)
    expect(normalized).toMatchObject({ type: 'LocalShellCall', command: 'pwd', call_id: 'call-123' })
    expect(ResponseItemSchema.safeParse(normalized).success).toBe(true)
  })

  it('normalizes tool_result events with structured output', () => {
    const raw = {
      type: 'tool_result',
      tool_name: 'google_web_search',
      tool_id: 'call-456',
      output: { query: 'foo', results: [{ title: 'Foo', url: 'https://foo.test', snippet: '...' }] },
    }
    const normalized = normalizeGeminiEventShape(raw, raw)
    expect(normalized).toMatchObject({ type: 'WebSearchCall', query: 'foo' })
    expect(ResponseItemSchema.safeParse(normalized).success).toBe(true)
  })
})

function makeMockBlob(content: string) {
  const buffer = Buffer.from(content, 'utf8')
  return {
    size: buffer.length,
    text: async () => buffer.toString('utf8'),
  } as unknown as Blob
}
