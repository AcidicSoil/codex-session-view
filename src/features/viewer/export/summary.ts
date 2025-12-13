import type { TimelinePreferencesState } from '~/lib/ui-settings'
import type { ExportScope } from './types'

export function describeFilters(preferences: TimelinePreferencesState) {
  const parts: string[] = []
  if (preferences.searchQuery.trim()) {
    parts.push(`search="${preferences.searchQuery.trim()}"`)
  }
  if (preferences.quickFilter !== 'all') {
    parts.push(`quick=${preferences.quickFilter}`)
  }
  if (preferences.roleFilter !== 'all') {
    parts.push(`role=${preferences.roleFilter}`)
  }
  if (preferences.filters.length) {
    parts.push(`${preferences.filters.length} filter(s)`)
  }
  if (preferences.commandFilter.families.length) {
    parts.push(`commands=${preferences.commandFilter.families.join('+')}`)
  }
  if (preferences.commandFilter.query.trim()) {
    parts.push(`commandQuery="${preferences.commandFilter.query.trim()}"`)
  }
  if (preferences.eventRange?.startIndex != null || preferences.eventRange?.endIndex != null) {
    const start = preferences.eventRange?.startIndex ?? 0
    const end = preferences.eventRange?.endIndex ?? '…'
    parts.push(`range=${start}-${end}`)
  }
  return parts.length ? parts.join(', ') : null
}

export function buildFilename(scope: ExportScope, ext: string, sessionId: string, options?: { rangeLabel?: string; selectedEventId?: number; partial?: boolean }) {
  const date = new Date()
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 32) || 'session'
  const parts = [safeSessionId]
  switch (scope) {
    case 'entire':
      parts.push('entire')
      break
    case 'filtered':
      parts.push('filtered')
      break
    case 'range':
      parts.push(options?.rangeLabel ? `range-${options.rangeLabel.replace(/\\s+/g, '')}` : 'range')
      break
    case 'event':
      parts.push(options?.selectedEventId != null ? `event-${options.selectedEventId}` : 'event')
      break
  }
  if (options?.partial || scope !== 'entire') {
    parts.push('partial')
  }
  parts.push(stamp)
  return `${parts.join('-')}.${ext}`
}
