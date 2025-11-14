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
  events: readonly ResponseItem[]
}

export function TimelineWithFilters({ events }: TimelineWithFiltersProps) {
  const [filters, setFilters] = useState<Filter<TimelineFilterValue>[]>([])
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const searchMatches = useMemo(() => applyTimelineSearch(events, searchQuery), [events, searchQuery])
  const filteredEvents = useMemo(
    () => applyTimelineFilters(searchMatches, { filters, quickFilter }),
    [searchMatches, filters, quickFilter],
  )

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
      <AnimatedTimelineList events={filteredEvents} />
    </div>
  )
}

function applyTimelineSearch(events: readonly ResponseItem[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return events

  return events.filter((event) => {
    const anyEvent = event as any
    const parts: string[] = []

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

    const haystack = parts.join(' ').toLowerCase()
    if (!haystack) return false
    return haystack.includes(normalized)
  })
}
