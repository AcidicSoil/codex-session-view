import { X } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type {
  ActiveFilterBadge,
  FilterBadgeKey,
  SessionExplorerFilterDimensions,
  SessionExplorerFilterState,
  SortDirection,
  SortKey,
} from './sessionExplorerTypes'
import { SessionFiltersPanel } from './SessionFiltersPanel'

interface SessionFiltersToolbarProps {
  filters: SessionExplorerFilterState
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void
  updateFilters: (updater: (prev: SessionExplorerFilterState) => SessionExplorerFilterState) => void
  onResetFilters: () => void
  activeBadges: ActiveFilterBadge[]
  onBadgeClear: (key: FilterBadgeKey) => void
  filterDimensions: SessionExplorerFilterDimensions
}

export function SessionFiltersToolbar({
  filters,
  updateFilter,
  updateFilters,
  onResetFilters,
  activeBadges,
  onBadgeClear,
  filterDimensions,
}: SessionFiltersToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/15 bg-[#04070f] p-4 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filters.sortKey} onValueChange={(value: SortKey) => updateFilter('sortKey', value)}>
            <SelectTrigger aria-label="Sort sessions by" className="w-40 border-white/20 bg-transparent text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent align="start" className="border-white/10 bg-[#090c15] text-white">
              <SelectItem value="timestamp">Timestamp</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={filters.sortDir}
            onValueChange={(value) => value && updateFilter('sortDir', value as SortDirection)}
            aria-label="Sort direction"
            className="flex rounded-full border border-white/15"
          >
            <ToggleGroupItem value="asc" aria-label="Sort ascending" className="text-xs">
              ↑ ASC
            </ToggleGroupItem>
            <ToggleGroupItem value="desc" aria-label="Sort descending" className="text-xs">
              ↓ DESC
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
      <SessionFiltersPanel
        filters={filters}
        filterDimensions={filterDimensions}
        updateFilter={updateFilter}
        updateFilters={updateFilters}
        onResetFilters={onResetFilters}
      />
      {activeBadges.length ? (
        <div
          className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
          data-testid="active-filter-badges"
        >
          {activeBadges.map((badge) => (
            <span
              key={badge.key}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white"
            >
              {badge.label}
              <button
                type="button"
                aria-label={`Clear ${badge.description}`}
                onClick={() => onBadgeClear(badge.key)}
                className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <X className="size-4" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
