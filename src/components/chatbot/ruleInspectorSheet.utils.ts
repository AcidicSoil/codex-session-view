import type { HookRuleSummary } from '~/server/lib/hookifyRuntime'
import type { ResponseItemParsed } from '~/lib/session-parser'
import type { SearchMatcher } from '~/utils/search'
import { matchesSearchMatchers } from '~/utils/search'

export function matchesSearchText(rule: HookRuleSummary, matchers: SearchMatcher[], raw: string) {
  if (!raw.trim()) return true
  const haystack = `${rule.id} ${rule.title} ${rule.summary}`
  return matchesSearchMatchers(haystack, matchers)
}

export function formatEventPreview(event?: ResponseItemParsed) {
  if (!event) return 'Event data not available.'
  if (event.type === 'Message') {
    const content = Array.isArray(event.content)
      ? event.content.map((part) => ('text' in part ? part.text : '')).join('\n')
      : event.content
    const prefix = event.role ? `${event.role}: ` : ''
    return `${prefix}${content.slice(0, 160)}${content.length > 160 ? '…' : ''}`
  }
  if ('command' in event && typeof event.command === 'string') {
    return `${event.type}: ${event.command}`
  }
  if ('path' in event && typeof event.path === 'string') {
    return `${event.type}: ${event.path}`
  }
  return `${event.type} event`
}

export function formatEventDetail(event: ResponseItemParsed) {
  if (event.type === 'Message') {
    const content = Array.isArray(event.content)
      ? event.content.map((part) => ('text' in part ? part.text : '')).join('\n')
      : event.content
    return `${event.role ?? 'assistant'}\n${content}`
  }
  return JSON.stringify(event, null, 2)
}
