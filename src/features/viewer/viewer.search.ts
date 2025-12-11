import type { EventRangeInput } from '~/lib/session-events/range'
import type { TimelineCommandFilterState, TimelineRangeState } from '~/lib/ui-settings'

const RANGE_START_KEY = 'rangeStart'
const RANGE_END_KEY = 'rangeEnd'
const COMMAND_FAMILIES_KEY = 'cmd'
const COMMAND_QUERY_KEY = 'cmdQ'

export interface ViewerSearchState {
  startIndex?: number
  endIndex?: number
  commandFamilies: string[]
  commandQuery: string
}

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function parseFamilies(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(',').map((token) => token.trim()))
      .filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean)
  }
  return []
}

export function parseViewerSearch(search: Record<string, unknown> | undefined): ViewerSearchState {
  const startIndex = toNumber(search?.[RANGE_START_KEY])
  const endIndex = toNumber(search?.[RANGE_END_KEY])
  const commandFamilies = parseFamilies(search?.[COMMAND_FAMILIES_KEY])
  const commandQuery = typeof search?.[COMMAND_QUERY_KEY] === 'string' ? search?.[COMMAND_QUERY_KEY] ?? '' : ''
  return {
    startIndex,
    endIndex,
    commandFamilies,
    commandQuery,
  }
}

export function applyViewerSearchUpdates(
  prev: Record<string, unknown>,
  updater: (state: ViewerSearchState) => ViewerSearchState,
): Record<string, unknown> {
  const current = parseViewerSearch(prev)
  const next = updater(current)
  const normalizedFamilies = Array.from(new Set(next.commandFamilies.map((value) => value.trim()).filter(Boolean)))
  const result: Record<string, unknown> = { ...prev }

  if (typeof next.startIndex === 'number' && next.startIndex >= 0) {
    result[RANGE_START_KEY] = next.startIndex
  } else {
    delete result[RANGE_START_KEY]
  }

  if (typeof next.endIndex === 'number' && next.endIndex >= 0) {
    result[RANGE_END_KEY] = next.endIndex
  } else {
    delete result[RANGE_END_KEY]
  }

  if (normalizedFamilies.length > 0) {
    result[COMMAND_FAMILIES_KEY] = normalizedFamilies.join(',')
  } else {
    delete result[COMMAND_FAMILIES_KEY]
  }

  if (typeof next.commandQuery === 'string' && next.commandQuery.trim().length > 0) {
    result[COMMAND_QUERY_KEY] = next.commandQuery.trim()
  } else {
    delete result[COMMAND_QUERY_KEY]
  }

  return result
}

export function viewerSearchToRangeState(state: ViewerSearchState): TimelineRangeState | null {
  if (typeof state.startIndex !== 'number' && typeof state.endIndex !== 'number') {
    return null
  }
  return {
    startIndex: typeof state.startIndex === 'number' ? state.startIndex : undefined,
    endIndex: typeof state.endIndex === 'number' ? state.endIndex : undefined,
  }
}

export function viewerSearchToCommandFilter(state: ViewerSearchState): TimelineCommandFilterState {
  return {
    families: state.commandFamilies,
    query: state.commandQuery ?? '',
  }
}

export function rangeStateToEventInput(range: TimelineRangeState | null): EventRangeInput | undefined {
  if (!range) return undefined
  const hasStart = typeof range.startIndex === 'number'
  const hasEnd = typeof range.endIndex === 'number'
  if (!hasStart && !hasEnd) return undefined
  return {
    startIndex: hasStart ? range.startIndex! : undefined,
    endIndex: hasEnd ? range.endIndex! : undefined,
  }
}
