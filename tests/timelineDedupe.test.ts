import { describe, expect, it } from 'vitest'
import { dedupeTimelineEvents, type TimelineEvent } from '~/components/viewer/AnimatedTimelineList'

describe('dedupeTimelineEvents', () => {
  it('removes duplicate events with identical payloads', () => {
    const events: TimelineEvent[] = [
      { type: 'Message', role: 'user', content: 'hello', id: '1' },
      { type: 'Message', role: 'user', content: 'hello', id: '1' },
      { type: 'FunctionCall', name: 'run', args: { foo: 1 }, id: 'call-1' },
    ]
    const deduped = dedupeTimelineEvents(events)
    expect(deduped).toHaveLength(2)
  })

  it('keeps events that share an index but differ otherwise', () => {
    const events: TimelineEvent[] = [
      { type: 'Message', role: 'user', content: 'hi', index: 1 },
      { type: 'Message', role: 'assistant', content: 'hello', index: 1 },
    ]
    const deduped = dedupeTimelineEvents(events)
    expect(deduped).toHaveLength(2)
  })
  it('removes duplicate tool events that share the same id', () => {
    const events: TimelineEvent[] = [
      { type: 'FunctionCall', id: 'tool-1', name: 'cmd', args: { foo: 1 } },
      { type: 'FunctionCall', id: 'tool-1', name: 'cmd', args: { foo: 2 } },
      { type: 'FunctionCall', id: 'tool-2', name: 'cmd', args: { foo: 3 } },
    ]
    const deduped = dedupeTimelineEvents(events)
    expect(deduped).toHaveLength(2)
    expect(deduped.map((event) => event.id)).toEqual(['tool-1', 'tool-2'])
  })
  it('removes duplicate messages even if indexes differ', () => {
    const events: TimelineEvent[] = [
      { type: 'Message', role: 'user', content: 'hello', index: 1 },
      { type: 'Message', role: 'user', content: 'hello', index: 2 },
      { type: 'Message', role: 'assistant', content: 'hello', index: 3 },
    ]
    const deduped = dedupeTimelineEvents(events)
    expect(deduped).toHaveLength(2)
  })
})
