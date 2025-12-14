import { useMemo, useState, type ReactNode } from 'react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import {
  FamilyDrawerAnimatedContent,
  FamilyDrawerAnimatedWrapper,
  FamilyDrawerClose,
  FamilyDrawerContent,
  FamilyDrawerHeader,
  FamilyDrawerOverlay,
  FamilyDrawerPortal,
  FamilyDrawerRoot,
  FamilyDrawerTrigger,
} from '~/components/ui/family-drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { formatCount } from '~/utils/intl';
import { SessionFiltersPanel } from './SessionFiltersPanel';
import { SessionSearchBar } from './SessionSearchBar';
import type {
  ActiveFilterBadge,
  FilterBadgeKey,
  SessionExplorerFilterDimensions,
  SessionExplorerFilterState,
  SortDirection,
  SortKey,
} from './sessionExplorerTypes';

interface SessionExplorerToolbarProps {
  filters: SessionExplorerFilterState;
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void;
  updateFilters: (updater: (prev: SessionExplorerFilterState) => SessionExplorerFilterState) => void;
  onResetFilters: () => void;
  activeBadges: ActiveFilterBadge[];
  onBadgeClear: (key: FilterBadgeKey) => void;
  filterDimensions: SessionExplorerFilterDimensions;
  filteredSessionCount: number;
  totalSessionCount: number;
  uploadDrawerContent?: ReactNode;
}

export function SessionExplorerToolbar({
  filters,
  updateFilter,
  updateFilters,
  onResetFilters,
  activeBadges,
  onBadgeClear,
  filterDimensions,
  filteredSessionCount,
  totalSessionCount,
  uploadDrawerContent,
}: SessionExplorerToolbarProps) {
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isFiltersOpen, setFiltersOpen] = useState(false);

  const activeBadgePreview = useMemo(() => activeBadges.slice(0, 3), [activeBadges]);
  const remainingBadgeCount = Math.max(0, activeBadges.length - activeBadgePreview.length);
  const showUploadButton = Boolean(uploadDrawerContent);

  return (
    <div className="rounded-3xl border border-white/15 bg-[#04070f] p-4 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <SessionSearchBar filters={filters} updateFilter={updateFilter} className="min-w-0" />
          {activeBadges.length ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {activeBadgePreview.map((badge) => (
                <button
                  key={badge.key}
                  type="button"
                  onClick={() => onBadgeClear(badge.key)}
                  className="rounded-full border border-white/20 px-3 py-0.5 text-white/80 transition hover:border-white hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-white/60"
                >
                  {badge.label} ×
                </button>
              ))}
              {remainingBadgeCount > 0 ? <span>+{remainingBadgeCount} more</span> : null}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">All repositories · no filters selected.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <Badge variant="secondary" className="justify-center text-[10px] font-semibold uppercase tracking-wide">
            {formatCount(filteredSessionCount)} / {formatCount(totalSessionCount)} sessions
          </Badge>
          {showUploadButton ? (
            <FamilyDrawerRoot open={isUploadOpen} onOpenChange={setUploadOpen}>
              <FamilyDrawerTrigger asChild>
                <Button type="button">Upload session</Button>
              </FamilyDrawerTrigger>
              <FamilyDrawerPortal>
                <FamilyDrawerOverlay />
                <FamilyDrawerContent>
                  <FamilyDrawerAnimatedWrapper>
                    <FamilyDrawerAnimatedContent>
                      <FamilyDrawerHeader
                        icon={<span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Upload</span>}
                        title="Upload & Cache sessions"
                        description="Drop JSONL exports or ingest a folder to populate the explorer."
                      />
                      <div className="mt-4">{uploadDrawerContent}</div>
                      <FamilyDrawerClose className="top-6">✕</FamilyDrawerClose>
                    </FamilyDrawerAnimatedContent>
                  </FamilyDrawerAnimatedWrapper>
                </FamilyDrawerContent>
              </FamilyDrawerPortal>
            </FamilyDrawerRoot>
          ) : null}
          <FamilyDrawerRoot open={isFiltersOpen} onOpenChange={setFiltersOpen}>
            <FamilyDrawerTrigger asChild>
              <Button type="button" variant="outline">
                Filters
              </Button>
            </FamilyDrawerTrigger>
            <FamilyDrawerPortal>
              <FamilyDrawerOverlay />
              <FamilyDrawerContent>
                <FamilyDrawerAnimatedWrapper>
                  <FamilyDrawerAnimatedContent>
                    <FamilyDrawerHeader
                      icon={<span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Filters</span>}
                      title="Adjust filters"
                      description="Combine sources, branches, tags, and ranges without losing context."
                    />
                    <div className="mt-4 space-y-4">
                      <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Sort order</p>
                        <p className="text-xs text-white/50">Choose how sessions appear when browsing repositories.</p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
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
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {activeBadges.map((badge) => (
                            <button
                              key={badge.key}
                              type="button"
                              className="rounded-full border border-white/20 px-3 py-0.5 text-white"
                              onClick={() => onBadgeClear(badge.key)}
                            >
                              {badge.label} ×
                            </button>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <Button type="button" variant="ghost" className="text-sm" onClick={onResetFilters}>
                          Reset
                        </Button>
                        <Button type="button" onClick={() => setFiltersOpen(false)}>
                          Apply filters
                        </Button>
                      </div>
                    </div>
                    <FamilyDrawerClose className="top-6">✕</FamilyDrawerClose>
                  </FamilyDrawerAnimatedContent>
                </FamilyDrawerAnimatedWrapper>
              </FamilyDrawerContent>
            </FamilyDrawerPortal>
          </FamilyDrawerRoot>
        </div>
      </div>
    </div>
  );
}
