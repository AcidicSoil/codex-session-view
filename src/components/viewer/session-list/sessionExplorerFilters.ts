import { useMemo } from 'react'
import { buildSearchMatchers } from '~/utils/search'
import { getRecencyWindowMs, toBytes, toTimestampMs } from './sessionExplorerUtils'
import type { SessionExplorerFilterState } from './sessionExplorerTypes'

export function useSessionExplorerFilterDerived(
  filters: SessionExplorerFilterState,
  snapshotTimestamp: number,
) {
  const searchMatchers = useMemo(
    () => buildSearchMatchers(filters.searchText),
    [filters.searchText],
  )

  const sizeMinBytes = toBytes(filters.sizeMinValue, filters.sizeMinUnit)
  const sizeMaxBytes = toBytes(filters.sizeMaxValue, filters.sizeMaxUnit)
  const manualTimestampFromMs = toTimestampMs(filters.timestampFrom)
  const timestampToMs = toTimestampMs(filters.timestampTo)
  const recencyWindowMs = getRecencyWindowMs(filters.recency)
  const recencyFromMs = typeof recencyWindowMs === 'number' ? snapshotTimestamp - recencyWindowMs : undefined
  const timestampFromMs = resolveTimestampFrom(manualTimestampFromMs, recencyFromMs)

  return {
    searchMatchers,
    sizeMinBytes,
    sizeMaxBytes,
    manualTimestampFromMs,
    timestampToMs,
    recencyWindowMs,
    recencyFromMs,
    timestampFromMs,
  }
}

export function resolveTimestampFrom(manual?: number, recency?: number) {
  const sentinel = Number.NEGATIVE_INFINITY
  const normalizedManual = typeof manual === 'number' && Number.isFinite(manual) ? manual : sentinel
  const normalizedRecency = typeof recency === 'number' && Number.isFinite(recency) ? recency : sentinel
  const candidate = Math.max(normalizedManual, normalizedRecency)
  return candidate === sentinel ? undefined : candidate
}
