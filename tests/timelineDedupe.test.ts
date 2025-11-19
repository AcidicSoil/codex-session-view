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
})
