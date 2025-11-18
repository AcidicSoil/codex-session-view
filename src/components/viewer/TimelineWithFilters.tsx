import { useMemo, useState } from 'react'
import type { ResponseItem } from '~/lib/viewer-types'
import { AnimatedTimelineList } from '~/components/viewer/AnimatedTimelineList'
import type { Filter } from '~/components/ui/filters'
import {
  TimelineFilters,
  applyTimelineFilters,
  type QuickFilter,
  type TimelineFilterValue,
} from '~/components/viewer/TimelineFilters'

interface TimelineWithFiltersProps {
  /**
   * Raw timeline events. This component owns all filtering/search logic so
   * callers don't need to manage derived state themselves.
   */
  events: readonly ResponseItem[]
}

export function TimelineWithFilters({ events }: TimelineWithFiltersProps) {
  const [filters, setFilters] = useState<Filter<TimelineFilterValue>[]>([])
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const searchMatches = useMemo(
    () => applyTimelineSearch(events, searchQuery),
    [events, searchQuery],
  )
  const filteredEvents = useMemo(
    () => applyTimelineFilters(searchMatches, { filters, quickFilter }),
    [searchMatches, filters, quickFilter],
  )

  const hasSourceEvents = events.length > 0
  const hasFilteredEvents = filteredEvents.length > 0
  const noMatches = hasSourceEvents && !hasFilteredEvents

  return (
    <div className="space-y-4">
      <TimelineFilters
        events={events}
        filters={filters}
        onFiltersChange={setFilters}
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        filteredCount={filteredEvents.length}
        totalCount={events.length}
        searchMatchCount={searchMatches.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      {!hasSourceEvents ? (
        <p className="text-sm text-muted-foreground">Load or drop a session to populate the timeline.</p>
      ) : noMatches ? (
        <p className="text-sm text-muted-foreground">No events match your current filters.</p>
      ) : (
        <AnimatedTimelineList events={filteredEvents} />
      )}
    </div>
  )
}

export function applyTimelineSearch(events: readonly ResponseItem[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return events

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
                : ''
          )
          .join(' ')
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

    const haystack = parts.join(' ').toLowerCase()
    if (!haystack) return false
    return haystack.includes(normalized)
  })
}
