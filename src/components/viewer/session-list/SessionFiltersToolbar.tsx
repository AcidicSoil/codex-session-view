import { SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '~/components/ui/command';
import type {
  ActiveFilterBadge,
  FilterBadgeKey,
  QuickFilterOption,
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
  quickFilterOptions: QuickFilterOption[];
  isQuickFilterOpen: boolean;
  onQuickFilterOpenChange: (open: boolean) => void;
  onAdvancedToggle?: () => void;
  advancedOpen?: boolean;
  onResetFilters: () => void;
  activeBadges: ActiveFilterBadge[];
  onBadgeClear: (key: FilterBadgeKey) => void;
}

export function SessionFiltersToolbar({
  filters,
  sessionPreset,
  applyPreset,
  updateFilter,
  quickFilterOptions,
  isQuickFilterOpen,
  onQuickFilterOpenChange,
  onAdvancedToggle,
  advancedOpen,
  onResetFilters,
  activeBadges,
  onBadgeClear,
}: SessionFiltersToolbarProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={sessionPreset}
          onValueChange={(value) => applyPreset(value as SessionPreset)}
          className="w-full lg:w-auto min-w-0 flex-1"
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="heavy">Large</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={filters.sortKey} onValueChange={(value: SortKey) => updateFilter('sortKey', value)}>
            <SelectTrigger aria-label="Sort by" className="w-32">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="timestamp">Timestamp</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>
          <ToggleGroup
            type="single"
            value={filters.sortDir}
            onValueChange={(value) => value && updateFilter('sortDir', value as SortDirection)}
            aria-label="Sort direction"
            className="flex"
          >
            <ToggleGroupItem value="asc" aria-label="Sort ascending" className="text-xs">
              ↑ ASC
            </ToggleGroupItem>
            <ToggleGroupItem value="desc" aria-label="Sort descending" className="text-xs">
              ↓ DESC
            </ToggleGroupItem>
          </ToggleGroup>
          <Popover open={isQuickFilterOpen} onOpenChange={onQuickFilterOpenChange}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" className="gap-2">
                <SlidersHorizontal className="size-4" />
                Quick filters
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-0">
              <Command>
                <CommandInput placeholder="Search presets..." />
                <CommandList>
                  <CommandEmpty>No presets available.</CommandEmpty>
                  <CommandGroup heading="Presets">
                    {quickFilterOptions.map((option) => (
                      <CommandItem
                        key={option.key}
                        value={option.key}
                        onSelect={() => {
                          option.apply();
                          onQuickFilterOpenChange(false);
                        }}
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">{option.label}</p>
                          <p className="text-xs text-muted-foreground">{option.description}</p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
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
