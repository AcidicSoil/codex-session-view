import { useCallback, useEffect, useMemo } from 'react'
import { useRouter, useRouterState } from '@tanstack/react-router'
import type { EventRangeInput } from '~/lib/session-events/range'
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
import { buildSearchMatchers, type SearchMatcher } from '~/utils/search'
import { TimelineSearchBar } from '~/components/viewer/TimelineSearchBar'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import { useTimelineSearchNavigation } from '~/components/viewer/TimelineSearchNavigation.hooks'
import { sliceEventsByRange } from '~/lib/session-events/range'
import { matchesCommandFilter } from '~/lib/session-events/toolMetadata'
import { TimelineRangeControls } from '~/components/viewer/TimelineRangeControls'
import { ToolCommandFilter } from '~/components/viewer/ToolCommandFilter'
import { applyViewerSearchUpdates } from '~/features/viewer/viewer.search'
import type { ViewerSearchState } from '~/features/viewer/viewer.search'
import { applyTimelineSearch } from '~/features/viewer/timeline/search'

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
  onEventSelect?: (event: TimelineEvent, info: { displayIndex: number; absoluteIndex: number }) => void
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
  onEventSelect,
}: TimelineWithFiltersProps) {
  const timelinePreferences = useUiSettingsStore((state) => state.timelinePreferences)
  const updateTimelinePreferences = useUiSettingsStore((state) => state.updateTimelinePreferences)
  const setTimelineRange = useUiSettingsStore((state) => state.setTimelineRange)
  const setCommandFilter = useUiSettingsStore((state) => state.setCommandFilter)
  const { filters, quickFilter, roleFilter, sortOrder, searchQuery } = timelinePreferences
  const commandFilter = timelinePreferences.commandFilter
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
  const router = useRouter()
  const locationState = useRouterState({ select: (state) => state.location })
  const currentSearch = (locationState?.search as ViewerSearchState | Record<string, unknown> | undefined) ?? {}

  const handleRangeChange = useCallback(
    (next: EventRangeInput | null) => {
      setTimelineRange(next)
      const updated = applyViewerSearchUpdates(currentSearch as Record<string, unknown>, (state) => ({
        ...state,
        startIndex: typeof next?.startIndex === 'number' ? next.startIndex : undefined,
        endIndex: typeof next?.endIndex === 'number' ? next.endIndex : undefined,
      }))
      void router.navigate({ search: updated, replace: true })
    },
    [currentSearch, router, setTimelineRange],
  )

  const handleCommandFilterChange = useCallback(
    (next: typeof commandFilter) => {
      setCommandFilter(() => next)
      const updated = applyViewerSearchUpdates(currentSearch as Record<string, unknown>, (state) => ({
        ...state,
        commandFamilies: next.families,
        commandQuery: next.query,
      }))
      void router.navigate({ search: updated, replace: true })
    },
    [commandFilter, currentSearch, router, setCommandFilter],
  )

  const searchMatchers = useMemo(() => buildSearchMatchers(searchQuery), [searchQuery])

  const rangedResult = useMemo(
    () => sliceEventsByRange(events, timelinePreferences.eventRange),
    [events, timelinePreferences.eventRange],
  )
  const rangedEvents = rangedResult.events
  const commandFilteredEvents = useMemo(
    () => rangedEvents.filter((event) => matchesCommandFilter(event, commandFilter)),
    [rangedEvents, commandFilter],
  )

  const searchMatches = useMemo(
    () => applyTimelineSearch(commandFilteredEvents, searchMatchers),
    [commandFilteredEvents, searchMatchers],
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

  const hasSourceEvents = rangedEvents.length > 0
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
        totalCount={rangedEvents.length}
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
      {registerFilters ? null : (
        <div className="space-y-4">
          {filtersNode}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <TimelineRangeControls
                totalEvents={events.length}
                value={timelinePreferences.eventRange}
                onChange={handleRangeChange}
              />
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <p className="text-sm font-semibold">Command filters</p>
              <ToolCommandFilter value={commandFilter} onChange={handleCommandFilterChange} />
            </div>
          </div>
        </div>
      )}
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
          onSelect={(event, index) => {
            if (!onEventSelect) return
            const displayNumber = displayNumberMap.get(event) ?? index + 1
            onEventSelect(event, { displayIndex: displayNumber, absoluteIndex: index })
          }}
        />
      )}
    </div>
  )
}
