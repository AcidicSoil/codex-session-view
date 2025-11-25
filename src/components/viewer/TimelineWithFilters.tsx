import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ResponseItem } from '~/lib/viewer-types'
import { AnimatedTimelineList, type TimelineEvent } from '~/components/viewer/AnimatedTimelineList'
import type { Filter } from '~/components/ui/filters'
import {
  TimelineFilters,
  applyTimelineFilters,
  type QuickFilter,
  type RoleQuickFilter,
  type SortOrder,
  type TimelineFilterValue,
} from '~/components/viewer/TimelineFilters'
import { dedupeTimelineEvents } from '~/components/viewer/AnimatedTimelineList'
import { buildSearchMatchers, matchesSearchMatchers, type SearchMatcher } from '~/utils/search'

interface TimelineWithFiltersProps {
  /**
   * Raw timeline events. This component owns all filtering/search logic so
   * callers don't need to manage derived state themselves.
   */
  events: readonly ResponseItem[]
  onAddEventToChat?: (event: TimelineEvent, index: number) => void
}

export function TimelineWithFilters({ events, onAddEventToChat }: TimelineWithFiltersProps) {
  const [filters, setFilters] = useState<Filter<TimelineFilterValue>[]>([])
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [roleFilter, setRoleFilter] = useState<RoleQuickFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [searchQuery, setSearchQuery] = useState('')
  const searchMatchers = useMemo(() => buildSearchMatchers(searchQuery), [searchQuery])

  const searchMatches = useMemo(
    () => applyTimelineSearch(events, searchMatchers),
    [events, searchMatchers],
  )
  const filteredEvents = useMemo(
    () => applyTimelineFilters(searchMatches, { filters, quickFilter, roleFilter }),
    [searchMatches, filters, quickFilter, roleFilter],
  )
  const dedupedEvents = useMemo(() => dedupeTimelineEvents(filteredEvents), [filteredEvents])
  const orderedEvents = useMemo(
    () => (sortOrder === 'asc' ? dedupedEvents : [...dedupedEvents].reverse()),
    [dedupedEvents, sortOrder],
  )
  const displayNumberMap = useMemo(() => {
    const map = new WeakMap<TimelineEvent, number>()
    events.forEach((event, index) => {
      map.set(event as TimelineEvent, index + 1)
    })
    return map
  }, [events])
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null)

  const resetSearchNavigation = useCallback(() => {
    setActiveSearchIndex(null)
  }, [])

  useEffect(() => {
    resetSearchNavigation()
  }, [searchMatchers, resetSearchNavigation])

  useEffect(() => {
    if (orderedEvents.length === 0) {
      resetSearchNavigation()
      return
    }
    setActiveSearchIndex((current) => {
      if (current == null) return current
      if (current >= orderedEvents.length) {
        return orderedEvents.length - 1
      }
      return current
    })
  }, [orderedEvents.length, resetSearchNavigation])

  const handleSearchNext = useCallback(() => {
    if (!searchMatchers.length) return
    if (!orderedEvents.length) return
    setActiveSearchIndex((current) => {
      if (current == null) return 0
      const nextIndex = (current + 1) % orderedEvents.length
      return nextIndex
    })
  }, [orderedEvents.length, searchMatchers])

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
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        filteredCount={filteredEvents.length}
        totalCount={events.length}
        searchMatchCount={searchMatches.length}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchNext={handleSearchNext}
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />
      {!hasSourceEvents ? (
        <p className="text-sm text-muted-foreground">Load or drop a session to populate the timeline.</p>
      ) : noMatches ? (
        <p className="text-sm text-muted-foreground">No events match your current filters.</p>
      ) : (
        <AnimatedTimelineList
          events={orderedEvents}
          searchQuery={searchQuery}
          activeMatchIndex={activeSearchIndex}
          onAddEventToChat={onAddEventToChat}
          searchMatchers={searchMatchers}
          getDisplayNumber={(event) => displayNumberMap.get(event)}
        />
      )}
    </div>
  )
}

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

    const haystack = parts.join(' ')
    if (!haystack.trim()) return false
    return matchesSearchMatchers(haystack, matchers)
  })
}
