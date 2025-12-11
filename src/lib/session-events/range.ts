import type { ResponseItem } from '~/lib/viewer-types'
import type { ResponseItemParsed } from '~/lib/session-parser'

export interface EventRangeInput {
  startIndex?: number | null
  endIndex?: number | null
}

export interface EventRangeState {
  startIndex: number
  endIndex: number
  totalEvents: number
  applied: boolean
}

type EventLike = Pick<ResponseItem, 'index'> | Pick<ResponseItemParsed, 'index'>

function resolveIndex(fallbackIndex: number, event: EventLike | undefined) {
  if (!event) return fallbackIndex
  if (typeof event.index === 'number' && Number.isFinite(event.index)) {
    return event.index
  }
  return fallbackIndex
}

export function clampEventRange(totalEvents: number, input: EventRangeInput | null | undefined): EventRangeState {
  const maxIndex = Math.max(totalEvents - 1, 0)
  const hasExplicitStart = typeof input?.startIndex === 'number'
  const hasExplicitEnd = typeof input?.endIndex === 'number'
  let start = hasExplicitStart ? Math.max(0, Math.min(maxIndex, input!.startIndex!)) : 0
  let end = hasExplicitEnd ? Math.max(0, Math.min(maxIndex, input!.endIndex!)) : maxIndex
  if (start > end) {
    const temp = start
    start = end
    end = temp
  }
  return {
    startIndex: totalEvents === 0 ? 0 : start,
    endIndex: totalEvents === 0 ? 0 : end,
    totalEvents,
    applied: Boolean(totalEvents && (hasExplicitStart || hasExplicitEnd)),
  }
}

export function sliceEventsByRange<T extends EventLike>(events: readonly T[], input: EventRangeInput | null | undefined) {
  const range = clampEventRange(events.length, input)
  if (!range.applied || events.length === 0) {
    return { events: events.slice(), range }
  }
  const sliced = events.filter((event, arrayIndex) => {
    const resolvedIndex = resolveIndex(arrayIndex, event)
    return resolvedIndex >= range.startIndex && resolvedIndex <= range.endIndex
  })
  return { events: sliced, range }
}
