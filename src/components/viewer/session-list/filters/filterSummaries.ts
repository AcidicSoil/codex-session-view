import { formatDateTime } from '~/utils/intl'
import type { SessionExplorerFilterState } from '../sessionExplorerTypes'
import { RECENCY_PRESETS } from '../sessionExplorerUtils'

export interface FiltersDrawerSummaries {
  sort: string
  recency: string
  size: string
  timestamp: string
}

const SORT_KEY_LABELS: Record<SessionExplorerFilterState['sortKey'], string> = {
  timestamp: 'Timestamp',
  size: 'Size',
}

const recencyLabelMap = new Map(RECENCY_PRESETS.map((preset) => [preset.id, preset.label]))

export function buildFiltersDrawerSummaries(filters: SessionExplorerFilterState): FiltersDrawerSummaries {
  return {
    sort: formatSortSummary(filters),
    recency: formatRecencySummary(filters),
    size: formatSizeSummary(filters),
    timestamp: formatTimestampSummary(filters),
  }
}

function formatSortSummary(filters: SessionExplorerFilterState) {
  const keyLabel = SORT_KEY_LABELS[filters.sortKey]
  const directionLabel = filters.sortDir === 'desc' ? 'DESC' : 'ASC'
  return `${keyLabel} (${directionLabel})`
}

function formatRecencySummary(filters: SessionExplorerFilterState) {
  return recencyLabelMap.get(filters.recency) ?? 'Any time'
}

function formatSizeSummary(filters: SessionExplorerFilterState) {
  const min = filters.sizeMinValue.trim()
  const max = filters.sizeMaxValue.trim()
  if (!min && !max) {
    return 'All'
  }

  const formatValue = (value: string, unit: SessionExplorerFilterState['sizeMinUnit']) => `${value} ${unit}`
  if (min && max) {
    return `${formatValue(filters.sizeMinValue, filters.sizeMinUnit)} - ${formatValue(filters.sizeMaxValue, filters.sizeMaxUnit)}`
  }
  if (min) {
    return `>= ${formatValue(filters.sizeMinValue, filters.sizeMinUnit)}`
  }
  return `<= ${formatValue(filters.sizeMaxValue, filters.sizeMaxUnit)}`
}

function formatTimestampSummary(filters: SessionExplorerFilterState) {
  const from = filters.timestampFrom.trim()
  const to = filters.timestampTo.trim()
  if (!from && !to) {
    return 'All'
  }
  const fromLabel = from ? formatDateTime(from, { fallback: 'Any' }) : 'Any'
  const toLabel = to ? formatDateTime(to, { fallback: 'Any' }) : 'Any'
  return `${fromLabel} -> ${toLabel}`
}
