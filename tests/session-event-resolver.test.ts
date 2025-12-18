import { describe, expect, it } from 'vitest'
import type { SessionSnapshot } from '~/lib/sessions/model'
import { resolveTimelineContext } from '~/server/lib/sessionEventResolver'

const snapshot: SessionSnapshot = {
  sessionId: 'session-test',
  events: [
    {
      id: 'evt-1',
      type: 'Message',
      role: 'user',
      content: 'First user prompt',
      at: '2025-01-01T12:00:00Z',
      index: 0,
    },
    {
      id: 'evt-2',
      type: 'LocalShellCall',
      command: 'ls -la',
      stdout: 'package.json\nsrc',
      at: '2025-01-01T12:00:05Z',
      index: 1,
    },
    {
      id: 'evt-3',
      type: 'FunctionCall',
      name: 'run_tool',
      args: { path: 'src' },
      output: { ok: true },
      at: '2025-01-01T12:00:06Z',
      index: 2,
    },
  ],
}

describe('resolveTimelineContext', () => {
  it('extracts event references from inline #ids', () => {
    const result = resolveTimelineContext({
      snapshot,
      prompt: 'Explain #2 and #3 please',
    })
    expect(result.resolved).toHaveLength(2)
    expect(result.references?.map((ref) => ref.displayIndex)).toEqual([2, 3])
    expect(result.section?.content).toContain('Event #2')
    expect(result.section?.content).toContain('Event #3')
  })

  it('includes metadata ranges', () => {
    const result = resolveTimelineContext({
      snapshot,
      prompt: 'Focus on remediation',
      metadata: {
        eventRange: { startIndex: 1, endIndex: 1 },
      },
    })
    expect(result.references).toHaveLength(1)
    expect(result.references?.[0].displayIndex).toBe(2)
    expect(result.section?.content).toContain('Command: ls -la')
  })

  it('guards against out-of-range references', () => {
    const result = resolveTimelineContext({
      snapshot,
      prompt: 'Tell me about #2000',
    })
    expect(result.resolved).toHaveLength(0)
    expect(result.section).toBeNull()
    expect(result.references).toHaveLength(0)
  })
})
