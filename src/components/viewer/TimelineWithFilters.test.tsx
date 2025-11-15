import { describe, expect, it } from 'vitest'
import type { ResponseItem } from '~/lib/viewer-types'
import { applyTimelineFilters, type TimelineFilterValue } from './TimelineFilters'

const sampleEvents: ResponseItem[] = [
  { type: 'Message', role: 'user', content: 'hello' },
  { type: 'Reasoning', content: 'thinking' },
  { type: 'FunctionCall', name: 'sum', args: { a: 1 }, result: { sum: 1 } },
  { type: 'LocalShellCall', command: 'ls', stdout: 'README.md' },
  { type: 'WebSearchCall', query: 'who invented tanstack?' },
  { type: 'CustomToolCall', toolName: 'my-tool', output: { ok: true } },
  { type: 'FileChange', path: 'src/main.ts', diff: '+line' },
  { type: 'Other', data: { foo: 'bar' } },
]

function filterCount(type: string) {
  const filters = [
    { id: 'type', field: 'type', operator: 'is', values: [type] },
  ] satisfies { id: string; field: 'type'; operator: string; values: TimelineFilterValue[] }[]
  return applyTimelineFilters(sampleEvents, { filters, quickFilter: 'all' }).length
}

describe('applyTimelineFilters', () => {
  it('supports filtering by all known types', () => {
    const types = [
      'Message',
      'Reasoning',
      'FunctionCall',
      'LocalShellCall',
      'WebSearchCall',
      'CustomToolCall',
      'FileChange',
      'Other',
    ] as const
    for (const type of types) {
      expect(filterCount(type)).toBe(1)
    }
  })

  it('quick filter "messages" only keeps Message events', () => {
    const filtered = applyTimelineFilters(sampleEvents, { filters: [], quickFilter: 'messages' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].type).toBe('Message')
  })

  it('quick filter "tools" returns the tool-like events', () => {
    const filtered = applyTimelineFilters(sampleEvents, { filters: [], quickFilter: 'tools' })
    expect(filtered.map((event) => event.type)).toEqual([
      'FunctionCall',
      'LocalShellCall',
      'WebSearchCall',
      'CustomToolCall',
    ])
  })

  it('quick filter "files" returns only FileChange events', () => {
    const filtered = applyTimelineFilters(sampleEvents, { filters: [], quickFilter: 'files' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0].type).toBe('FileChange')
  })
})
