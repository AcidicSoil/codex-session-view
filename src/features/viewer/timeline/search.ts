import type { ResponseItem } from '~/lib/viewer-types'
import { matchesSearchMatchers, type SearchMatcher } from '~/utils/search'

export function applyTimelineSearch(events: readonly ResponseItem[], matchers: SearchMatcher[]) {
  if (!matchers.length) return events

  return events.filter((event) => {
    const anyEvent = event as any
    const parts: string[] = []
    const pushValue = (value: unknown) => {
      if (value == null) return
      if (typeof value === 'string') {
        parts.push(value)
        return
      }
      if (typeof value === 'number' || typeof value === 'boolean') {
        parts.push(String(value))
        return
      }
      if (Array.isArray(value)) {
        value.forEach((entry) => pushValue(entry))
        return
      }
      if (typeof value === 'object') {
        try {
          parts.push(JSON.stringify(value))
        } catch {}
      }
    }

    if (typeof anyEvent.type === 'string') parts.push(anyEvent.type)
    if (typeof anyEvent.role === 'string') parts.push(anyEvent.role)
    if (typeof anyEvent.name === 'string') parts.push(anyEvent.name)
    if (typeof anyEvent.command === 'string') parts.push(anyEvent.command)
    if (typeof anyEvent.path === 'string') parts.push(anyEvent.path)
    if (typeof anyEvent.query === 'string') parts.push(anyEvent.query)

    const content = anyEvent.content
    if (typeof content === 'string') {
      parts.push(content)
    } else if (Array.isArray(content)) {
      parts.push(
        content
          .map((part: unknown) =>
            typeof part === 'string'
              ? part
              : typeof (part as any).text === 'string'
                ? (part as any).text
                : '',
          )
          .join(' '),
      )
    }

    pushValue(anyEvent.stdout)
    pushValue(anyEvent.stderr)
    pushValue(anyEvent.result)
    pushValue(anyEvent.args)
    pushValue(anyEvent.output)
    pushValue(anyEvent.data)
    pushValue(anyEvent.meta)
    pushValue(anyEvent.git)
    pushValue(anyEvent.payload)

    try {
      parts.push(JSON.stringify(anyEvent))
    } catch {}

    const haystack = parts.join(' ')
    if (!haystack.trim()) return false
    return matchesSearchMatchers(haystack, matchers)
  })
}
