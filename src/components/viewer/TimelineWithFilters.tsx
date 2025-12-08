import { useCallback, useEffect, useMemo } from 'react'
import type { ResponseItem } from '~/lib/viewer-types'
import { AnimatedTimelineList, type TimelineEvent, type TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
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
import { TimelineSearchBar } from '~/components/viewer/TimelineSearchBar'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import { useTimelineSearchNavigation } from '~/components/viewer/TimelineSearchNavigation.hooks'

interface TimelineWithFiltersProps {
  /**
   * Raw timeline events. This component owns all filtering/search logic so
   * callers don't need to manage derived state themselves.
   */
  events: readonly ResponseItem[]
  onAddEventToChat?: (event: TimelineEvent, index: number) => void
  timelineHeight?: number
  registerFilters?: (node: React.ReactNode | null) => void
  registerSearchBar?: (node: React.ReactNode | null) => void
  flaggedEvents?: Map<number, TimelineFlagMarker>
  onFlaggedEventClick?: (marker: TimelineFlagMarker) => void
  focusEventIndex?: number | null
}

export function TimelineWithFilters({
  events,
  onAddEventToChat,
  timelineHeight,
  registerFilters,
  registerSearchBar,
  flaggedEvents,
  onFlaggedEventClick,
  focusEventIndex,
}: TimelineWithFiltersProps) {
  const timelinePreferences = useUiSettingsStore((state) => state.timelinePreferences)
  const updateTimelinePreferences = useUiSettingsStore((state) => state.updateTimelinePreferences)
  const { filters, quickFilter, roleFilter, sortOrder, searchQuery } = timelinePreferences
  const setFilters = useCallback(
    (next: Filter<TimelineFilterValue>[]) => {
      updateTimelinePreferences((prev) => ({ ...prev, filters: next }))
    },
    [updateTimelinePreferences],
  )
  const setQuickFilter = useCallback(
    (next: QuickFilter) => {
      updateTimelinePreferences((prev) => ({ ...prev, quickFilter: next }))
    },
    [updateTimelinePreferences],
  )
  const setRoleFilter = useCallback(
    (next: RoleQuickFilter) => {
      updateTimelinePreferences((prev) => ({ ...prev, roleFilter: next }))
    },
    [updateTimelinePreferences],
  )
  const setSortOrder = useCallback(
    (next: SortOrder) => {
      updateTimelinePreferences((prev) => ({ ...prev, sortOrder: next }))
    },
    [updateTimelinePreferences],
  )
  const setSearchQuery = useCallback(
    (value: string) => {
      updateTimelinePreferences((prev) => ({ ...prev, searchQuery: value }))
    },
    [updateTimelinePreferences],
  )
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
  const hasSearchQuery = searchQuery.trim().length > 0
  const navigationMatchCount = hasSearchQuery ? orderedEvents.length : 0
  const searchNavigation = useTimelineSearchNavigation({
    totalMatches: navigationMatchCount,
    resetToken: hasSearchQuery ? searchQuery : '',
  })
  const { activeIndex: activeSearchIndex, goNext: goToNextMatch, goPrev: goToPreviousMatch } = searchNavigation

  const hasSourceEvents = events.length > 0
  const hasFilteredEvents = filteredEvents.length > 0
  const noMatches = hasSourceEvents && !hasFilteredEvents

  const filtersNode = useMemo(
    () => (
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
        sortOrder={sortOrder}
        onSortOrderChange={setSortOrder}
      />
    ),
    [
      events,
      filters,
      quickFilter,
      roleFilter,
      filteredEvents.length,
      searchMatches.length,
      sortOrder,
    ],
  )

  const searchBarNode = useMemo(
    () => (
      <TimelineSearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchNext={goToNextMatch}
        onSearchPrev={goToPreviousMatch}
        totalMatches={navigationMatchCount}
        activeMatchIndex={activeSearchIndex}
      />
    ),
    [activeSearchIndex, goToNextMatch, goToPreviousMatch, navigationMatchCount, searchQuery, setSearchQuery],
  )

  useEffect(() => {
    if (!registerFilters) return
    registerFilters(filtersNode)
    return () => registerFilters(null)
  }, [registerFilters, filtersNode])

  useEffect(() => {
    if (!registerSearchBar) return
    registerSearchBar(searchBarNode)
    return () => registerSearchBar(null)
  }, [registerSearchBar, searchBarNode])

  const focusTimelineIndex = useMemo(() => {
    if (focusEventIndex == null) return null
    const target = orderedEvents.findIndex((event) => {
      const anyEvent = event as any
      if (typeof anyEvent.index === 'number') {
        return anyEvent.index === focusEventIndex
      }
      return false
    })
    return target >= 0 ? target : null
  }, [focusEventIndex, orderedEvents])

  return (
    <div className="space-y-4">
      {registerSearchBar ? null : (
        <div className="sticky top-0 z-20 border-b border-white/10 bg-[#0d1117] py-3">
          {searchBarNode}
        </div>
      )}
      {registerFilters ? null : filtersNode}
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
          height={timelineHeight}
          flaggedEvents={flaggedEvents}
          onFlaggedEventClick={onFlaggedEventClick}
          externalFocusIndex={focusTimelineIndex}
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
