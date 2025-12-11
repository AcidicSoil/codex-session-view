import { memo } from 'react'
import type { EventRangeState } from '~/lib/session-events/range'

interface TimelineRangeSummaryProps {
  range: EventRangeState
}

export const TimelineRangeSummary = memo(({ range }: TimelineRangeSummaryProps) => {
  const start = range.applied ? range.startIndex : 0
  const end = range.applied ? range.endIndex : Math.max(range.totalEvents - 1, 0)
  return (
    <p className="text-xs text-muted-foreground">
      Showing {start}–{end} / {range.totalEvents}
    </p>
  )
})
