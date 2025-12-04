import { X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { MultiSelector, type MultiSelectorGroup, type MultiSelectorOption, type MultiSelectorValue } from '~/components/ui/multi-selector'
import type {
  ActiveFilterBadge,
  FilterBadgeKey,
  SessionExplorerFilterState,
  SessionPreset,
  SortDirection,
  SortKey,
} from './sessionExplorerTypes';

interface SessionFiltersToolbarProps {
  filters: SessionExplorerFilterState;
  sessionPreset: SessionPreset;
  applyPreset: (value: SessionPreset) => void;
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void;
  onAdvancedToggle?: () => void;
  advancedOpen?: boolean;
  onResetFilters: () => void;
  activeBadges: ActiveFilterBadge[];
  onBadgeClear: (key: FilterBadgeKey) => void;
  multiSelectorGroups: MultiSelectorGroup[];
  multiSelectorOptions: MultiSelectorOption[];
  multiSelectorValue: MultiSelectorValue;
  onMultiSelectorChange: (value: MultiSelectorValue) => void;
}

export function SessionFiltersToolbar({
  filters,
  sessionPreset,
  applyPreset,
  updateFilter,
  onAdvancedToggle,
  advancedOpen,
  onResetFilters,
  activeBadges,
  onBadgeClear,
  multiSelectorGroups,
  multiSelectorOptions,
  multiSelectorValue,
  onMultiSelectorChange,
}: SessionFiltersToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-3xl border border-white/15 bg-[#04070f] p-4 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Tabs
            value={sessionPreset}
            onValueChange={(value) => applyPreset(value as SessionPreset)}
          className="w-full min-w-0 flex-1 lg:w-auto"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="heavy">Large</TabsTrigger>
          </TabsList>
        </Tabs>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={filters.sortKey} onValueChange={(value: SortKey) => updateFilter('sortKey', value)}>
              <SelectTrigger aria-label="Sort by" className="w-32 border-white/20 bg-transparent text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent align="end" className="border-white/10 bg-[#090c15] text-white">
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
            {onAdvancedToggle ? (
              <Button type="button" variant="secondary" className="gap-2" onClick={onAdvancedToggle}>
                Advanced {advancedOpen ? '−' : '+'}
              </Button>
            ) : null}
            <Button type="button" variant="ghost" onClick={onResetFilters}>
              Reset
            </Button>
          </div>
        </div>
        <MultiSelector
          groups={multiSelectorGroups}
          options={multiSelectorOptions}
          value={multiSelectorValue}
          onChange={onMultiSelectorChange}
          triggerLabel="Filter matrix"
          placeholder="Select sources, branches, tags, and recency"
          maxVisibleChips={4}
        />
      </div>
      {activeBadges.length ? (
        <div
          className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
          data-testid="active-filter-badges"
        >
          {activeBadges.map((badge) => (
            <Badge key={badge.key} variant="secondary" className="flex items-center gap-2 whitespace-nowrap">
              {badge.label}
              <button
                type="button"
                aria-label={`Clear ${badge.description}`}
                onClick={() => onBadgeClear(badge.key)}
                className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
