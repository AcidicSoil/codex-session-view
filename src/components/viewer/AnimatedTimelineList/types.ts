import type { ResponseItem, ResponseItemParsed } from '~/lib/session-parser'
import type { SearchMatcher } from '~/utils/search'
import type { MisalignmentRecord, MisalignmentSeverity } from '~/lib/sessions/model'
import type { SessionOrigin } from '~/lib/session-origin'

export type TimelineEvent = (ResponseItem | ResponseItemParsed) & { origin?: SessionOrigin }

export interface TimelineFlagMarker {
  severity: MisalignmentSeverity
  misalignments: MisalignmentRecord[]
}

export interface AnimatedTimelineListProps {
  events: readonly TimelineEvent[]
  className?: string
  onSelect?: (event: TimelineEvent, index: number) => void
  searchQuery?: string
  activeMatchIndex?: number | null
  onAddEventToChat?: (event: TimelineEvent, index: number) => void
  searchMatchers?: SearchMatcher[]
  getDisplayNumber?: (event: TimelineEvent, index: number) => number | null | undefined
  height?: number
  flaggedEvents?: Map<number, TimelineFlagMarker>
  onFlaggedEventClick?: (marker: TimelineFlagMarker) => void
  externalFocusIndex?: number | null
}
