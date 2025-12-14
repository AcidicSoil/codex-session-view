import { defaultFilterState, SIZE_UNITS, type SessionExplorerFilterState, type SizeUnit, type SortDirection, type SortKey, type SessionRecencyPreset } from '~/components/viewer/session-list/sessionExplorerTypes'

const SEARCH_KEYS = {
  searchText: 'sxSearch',
  sortKey: 'sxSort',
  sortDir: 'sxSortDir',
  sizeMinValue: 'sxSizeMin',
  sizeMinUnit: 'sxSizeMinUnit',
  sizeMaxValue: 'sxSizeMax',
  sizeMaxUnit: 'sxSizeMaxUnit',
  timestampFrom: 'sxTsFrom',
  timestampTo: 'sxTsTo',
  recency: 'sxRecency',
} as const

const ALLOWED_SORT_KEYS: SortKey[] = ['timestamp', 'size']
const ALLOWED_SORT_DIRECTIONS: SortDirection[] = ['asc', 'desc']
const ALLOWED_RECENCY: SessionRecencyPreset[] = ['all', '24h', '7d', '30d']
const ALLOWED_SIZE_UNITS: SizeUnit[] = SIZE_UNITS

type SearchRecord = Record<string, unknown>

export function parseSessionExplorerSearch(search: SearchRecord | undefined): SessionExplorerFilterState {
  const base = { ...defaultFilterState }
  if (!search) {
    return base
  }
  return {
    ...base,
    searchText: parseString(search[SEARCH_KEYS.searchText], base.searchText),
    sortKey: parseEnum(search[SEARCH_KEYS.sortKey], ALLOWED_SORT_KEYS, base.sortKey),
    sortDir: parseEnum(search[SEARCH_KEYS.sortDir], ALLOWED_SORT_DIRECTIONS, base.sortDir),
    sizeMinValue: parseString(search[SEARCH_KEYS.sizeMinValue], ''),
    sizeMinUnit: parseEnum(search[SEARCH_KEYS.sizeMinUnit], ALLOWED_SIZE_UNITS, base.sizeMinUnit),
    sizeMaxValue: parseString(search[SEARCH_KEYS.sizeMaxValue], ''),
    sizeMaxUnit: parseEnum(search[SEARCH_KEYS.sizeMaxUnit], ALLOWED_SIZE_UNITS, base.sizeMaxUnit),
    timestampFrom: parseString(search[SEARCH_KEYS.timestampFrom], ''),
    timestampTo: parseString(search[SEARCH_KEYS.timestampTo], ''),
    recency: parseEnum(search[SEARCH_KEYS.recency], ALLOWED_RECENCY, base.recency),
  }
}

type Updater = SessionExplorerFilterState | ((state: SessionExplorerFilterState) => SessionExplorerFilterState)

export function applySessionExplorerSearch(prev: SearchRecord, next: Updater): SearchRecord {
  const current = parseSessionExplorerSearch(prev)
  const target = typeof next === 'function' ? (next as (state: SessionExplorerFilterState) => SessionExplorerFilterState)(current) : next
  const result: SearchRecord = { ...prev }
  assignString(result, SEARCH_KEYS.searchText, target.searchText)
  assignEnum(result, SEARCH_KEYS.sortKey, target.sortKey, defaultFilterState.sortKey)
  assignEnum(result, SEARCH_KEYS.sortDir, target.sortDir, defaultFilterState.sortDir)
  assignString(result, SEARCH_KEYS.sizeMinValue, target.sizeMinValue)
  assignEnum(result, SEARCH_KEYS.sizeMinUnit, target.sizeMinUnit, defaultFilterState.sizeMinUnit)
  assignString(result, SEARCH_KEYS.sizeMaxValue, target.sizeMaxValue)
  assignEnum(result, SEARCH_KEYS.sizeMaxUnit, target.sizeMaxUnit, defaultFilterState.sizeMaxUnit)
  assignString(result, SEARCH_KEYS.timestampFrom, target.timestampFrom)
  assignString(result, SEARCH_KEYS.timestampTo, target.timestampTo)
  assignEnum(result, SEARCH_KEYS.recency, target.recency, defaultFilterState.recency)
  return result
}

export function sessionExplorerFiltersEqual(a: SessionExplorerFilterState, b: SessionExplorerFilterState): boolean {
  return (
    a.searchText === b.searchText &&
    a.sortKey === b.sortKey &&
    a.sortDir === b.sortDir &&
    a.sizeMinValue === b.sizeMinValue &&
    a.sizeMinUnit === b.sizeMinUnit &&
    a.sizeMaxValue === b.sizeMaxValue &&
    a.sizeMaxUnit === b.sizeMaxUnit &&
    a.timestampFrom === b.timestampFrom &&
    a.timestampTo === b.timestampTo &&
    a.recency === b.recency
  )
}

function parseString(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value
  return fallback
}

function parseEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  if (typeof value === 'string') {
    const normalized = value as T
    if (allowed.includes(normalized)) {
      return normalized
    }
  }
  return fallback
}

function assignString(target: SearchRecord, key: string, value: string) {
  if (value && value.trim().length > 0) {
    target[key] = value
  } else {
    delete target[key]
  }
}

function assignEnum<T extends string>(target: SearchRecord, key: string, value: T, defaultValue: T) {
  if (value !== defaultValue) {
    target[key] = value
  } else {
    delete target[key]
  }
}
