import { useMemo } from 'react'
import { Filters } from '~/components/ui/filters'
import type { Filter, FilterFieldsConfig } from '~/components/ui/filters'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type { ResponseItem } from '~/lib/viewer-types'

export type TimelineFilterFieldKey = 'type'
export type TimelineFilterValue = string
export type QuickFilter = 'all' | 'messages' | 'tools' | 'files'

interface TimelineFiltersProps {
  events: readonly ResponseItem[]
  filters: Filter<TimelineFilterValue>[]
  onFiltersChange: (next: Filter<TimelineFilterValue>[]) => void
  quickFilter: QuickFilter
  onQuickFilterChange: (next: QuickFilter) => void
  filteredCount: number
  totalCount: number
  searchMatchCount: number
  searchQuery: string
  onSearchChange: (next: string) => void
}

const defaultTypeOptions = [
  'Message',
  'Reasoning',
  'FunctionCall',
  'LocalShellCall',
  'WebSearchCall',
  'CustomToolCall',
  'FileChange',
  'Other',
]

const quickFilterOptions: { label: string; value: QuickFilter; description: string }[] = [
  { value: 'all', label: 'All', description: 'Everything' },
  { value: 'messages', label: 'Messages', description: 'Only user/assistant text' },
  { value: 'tools', label: 'Tools', description: 'Function + tool executions' },
  { value: 'files', label: 'Files', description: 'File change diff events' },
]

export function TimelineFilters({
  events,
  filters,
  onFiltersChange,
  quickFilter,
  onQuickFilterChange,
  filteredCount,
  totalCount,
  searchMatchCount,
  searchQuery,
  onSearchChange,
}: TimelineFiltersProps) {
  const fieldOptions = useMemo(() => buildFieldConfig(events), [events])

  return (
    <div className="rounded-xl border bg-muted/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">Filters</p>
          <p className="text-xs text-muted-foreground">
            Showing {filteredCount.toLocaleString()} of {searchMatchCount.toLocaleString()} matches
            {searchMatchCount !== totalCount ? ` (from ${totalCount.toLocaleString()} events)` : null}
          </p>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          value={quickFilter}
          onValueChange={(value) => {
            if (!value) return
            onQuickFilterChange(value as QuickFilter)
          }}
          className="flex flex-wrap gap-1"
        >
          {quickFilterOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={option.description}
              className="flex items-center gap-1 text-[11px]"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="mt-4">
        <Filters
          filters={filters}
          fields={fieldOptions}
          onChange={onFiltersChange}
          size="sm"
          radius="full"
          showSearchInput={false}
          addButtonText="Add condition"
          className="flex flex-wrap gap-2"
        />
      </div>

      <div className="mt-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          Timeline search
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter by content, path, or type…"
            className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
    </div>
  )
}

export function applyTimelineFilters(
  events: readonly ResponseItem[],
  state: { filters: Filter<TimelineFilterValue>[]; quickFilter: QuickFilter },
) {
  if (!events.length) return [] as ResponseItem[]
  const { filters, quickFilter } = state
  return events.filter((event) => matchesQuickFilter(event, quickFilter) && matchesFilterSet(event, filters))
}

function buildFieldConfig(events: readonly ResponseItem[]): FilterFieldsConfig<TimelineFilterValue> {
  const types = new Set<string>(defaultTypeOptions)
  for (const event of events) {
    if (typeof event.type === 'string') {
      types.add(event.type)
    }
  }

  return [
    {
      key: 'type',
      label: 'Event type',
      type: 'multiselect',
      options: Array.from(types).sort().map((value) => ({ value, label: value })),
      allowCustomValues: false,
      searchable: true,
    },
  ]
}

function matchesQuickFilter(event: ResponseItem, quickFilter: QuickFilter) {
  switch (quickFilter) {
    case 'messages':
      return event.type === 'Message'
    case 'tools':
      return ['FunctionCall', 'LocalShellCall', 'CustomToolCall', 'WebSearchCall'].includes(event.type)
    case 'files':
      return event.type === 'FileChange'
    default:
      return true
  }
}

function matchesFilterSet(event: ResponseItem, filters: Filter<TimelineFilterValue>[]) {
  if (!filters.length) return true
  return filters.every((filter) => matchesFilter(event, filter))
}

function matchesFilter(event: ResponseItem, filter: Filter<TimelineFilterValue>) {
  if (filter.field !== 'type') return true
  const values = (filter.values ?? []).map((value) => value.toLowerCase())
  return compareValue(event.type, values, filter.operator)
}

function compareValue(
  rawValue: string | undefined,
  allowed: string[],
  operator: string,
) {
  const value = rawValue?.toLowerCase()
  if (operator === 'empty') return !value
  if (operator === 'not_empty') return Boolean(value)
  if (!allowed.length) return true

  switch (operator) {
    case 'is':
    case 'equals':
    case 'is_any_of':
    case 'includes':
    case 'includes_any_of':
      return value ? allowed.includes(value) : false
    case 'is_not':
    case 'not_equals':
    case 'is_not_any_of':
    case 'excludes_all':
      return value ? !allowed.includes(value) : true
    case 'includes_all':
      return value ? allowed.every((allowedValue) => allowedValue === value) : false
    default:
      return true
  }
}
