import { useMemo } from 'react'
import { buildSearchMatchers } from '~/utils/search'
import { sliceEventsByRange } from '~/lib/session-events/range'
import { matchesCommandFilter } from '~/lib/session-events/toolMetadata'
import { applyTimelineFilters } from '~/components/viewer/TimelineFilters'
import { dedupeTimelineEvents } from '~/components/viewer/AnimatedTimelineList'
import type { ResponseItemParsed } from '~/lib/session-parser'
import type { TimelinePreferencesState } from '~/lib/ui-settings'
import type { SelectedTimelineEvent, ScopeResolution, ExportScope } from './types'
import { applyTimelineSearch } from '~/features/viewer/timeline/search'

interface TimelineFilterResult {
  filteredEvents: ResponseItemParsed[]
  rangeEvents: ResponseItemParsed[]
  rangeLabel?: string
}

export function useTimelineFilterDerivatives(events: ResponseItemParsed[], preferences: TimelinePreferencesState): TimelineFilterResult {
  return useMemo(() => {
    if (!events.length) {
      return { filteredEvents: [], rangeEvents: [], rangeLabel: undefined }
    }
    const { eventRange, commandFilter, filters, quickFilter, roleFilter, sortOrder, searchQuery } = preferences
    const { events: rangedEvents, range } = sliceEventsByRange(events, eventRange)
    const rangeLabel =
      range?.applied && typeof range?.startIndex === 'number' && typeof range?.endIndex === 'number'
        ? `${range.startIndex} – ${range.endIndex}`
        : undefined
    const commandFiltered = rangedEvents.filter((event) => matchesCommandFilter(event, commandFilter))
    const searchMatchers = buildSearchMatchers(searchQuery)
    const searchMatched = applyTimelineSearch(commandFiltered, searchMatchers)
    const filtered = applyTimelineFilters(searchMatched, { filters, quickFilter, roleFilter })
    const deduped = dedupeTimelineEvents(filtered) as ResponseItemParsed[]
    const ordered = sortOrder === 'asc' ? deduped : [...deduped].reverse()
    return {
      filteredEvents: ordered,
      rangeEvents: rangedEvents,
      rangeLabel,
    }
  }, [events, preferences])
}

interface ResolveScopeOptions {
  scope: ExportScope
  events: ResponseItemParsed[]
  filteredEvents: ResponseItemParsed[]
  rangeEvents: ResponseItemParsed[]
  rangeLabel?: string
  selectedEvent?: SelectedTimelineEvent | null
}

export function resolveScope(options: ResolveScopeOptions): ScopeResolution {
  const { scope, events, filteredEvents, rangeEvents, rangeLabel, selectedEvent } = options
  switch (scope) {
    case 'entire':
      return {
        scope,
        events,
        isPartial: false,
        label: 'Entire session',
      }
    case 'filtered': {
      return {
        scope,
        events: filteredEvents,
        isPartial: true,
        label: 'Current filter view',
      }
    }
    case 'range': {
      return {
        scope,
        events: rangeEvents,
        isPartial: Boolean(rangeLabel),
        label: rangeLabel ? `Selected range (${rangeLabel})` : 'Selected range',
        rangeLabel,
      }
    }
    case 'event': {
      const eventList = selectedEvent ? [selectedEvent.event] : []
      return {
        scope,
        events: eventList,
        isPartial: true,
        label: selectedEvent ? `Event #${selectedEvent.displayIndex}` : 'Single event',
        requiresSelection: true,
        selectedEvent,
      }
    }
    default:
      return {
        scope: 'entire',
        events,
        isPartial: false,
        label: 'Entire session',
      }
  }
}
