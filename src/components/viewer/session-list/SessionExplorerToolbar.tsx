import { useCallback, useMemo, useState, type ReactNode } from 'react';
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
  FamilyDrawerViewContent,
  type ViewsRegistry,
} from '~/components/ui/family-drawer';
import { formatCount } from '~/utils/intl';
import {
  FiltersDrawerRecencyView,
  FiltersDrawerRootView,
  FiltersDrawerSizeView,
  FiltersDrawerSortView,
  FiltersDrawerTimestampView,
  buildFiltersDrawerSummaries,
} from './filters';
import { SessionSearchBar } from './SessionSearchBar';
import type {
  ActiveFilterBadge,
  FilterBadgeKey,
  SessionExplorerFilterState,
} from './sessionExplorerTypes';

interface SessionExplorerToolbarProps {
  filters: SessionExplorerFilterState;
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void;
  onResetFilters: () => void;
  activeBadges: ActiveFilterBadge[];
  onBadgeClear: (key: FilterBadgeKey) => void;
  filteredSessionCount: number;
  totalSessionCount: number;
  uploadDrawerContent?: ReactNode;
}

export function SessionExplorerToolbar({
  filters,
  updateFilter,
  onResetFilters,
  activeBadges,
  onBadgeClear,
  filteredSessionCount,
  totalSessionCount,
  uploadDrawerContent,
}: SessionExplorerToolbarProps) {
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [isFiltersOpen, setFiltersOpen] = useState(false);
  const [filtersDrawerKey, setFiltersDrawerKey] = useState(0);

  const handleFiltersOpenChange = useCallback((nextOpen: boolean) => {
    setFiltersOpen(nextOpen);
    if (!nextOpen) {
      setFiltersDrawerKey((prev) => prev + 1);
    }
  }, []);

  const activeBadgePreview = useMemo(() => activeBadges.slice(0, 3), [activeBadges]);
  const remainingBadgeCount = Math.max(0, activeBadges.length - activeBadgePreview.length);
  const showUploadButton = Boolean(uploadDrawerContent);
  const filterSummaries = useMemo(() => buildFiltersDrawerSummaries(filters), [filters]);

  const filterViews = useMemo<ViewsRegistry>(
    () => ({
      default: () => (
        <FiltersDrawerRootView
          summaries={filterSummaries}
          onReset={onResetFilters}
          onApply={() => handleFiltersOpenChange(false)}
        />
      ),
      sort: () => (
        <FiltersDrawerSortView
          sortKey={filters.sortKey}
          sortDir={filters.sortDir}
          onSortKeyChange={(value) => updateFilter('sortKey', value)}
          onSortDirChange={(value) => updateFilter('sortDir', value)}
        />
      ),
      recency: () => (
        <FiltersDrawerRecencyView value={filters.recency} onSelect={(value) => updateFilter('recency', value)} />
      ),
      size: () => (
        <FiltersDrawerSizeView
          minValue={filters.sizeMinValue}
          maxValue={filters.sizeMaxValue}
          minUnit={filters.sizeMinUnit}
          maxUnit={filters.sizeMaxUnit}
          onValueChange={(key, value) => updateFilter(key, value)}
          onUnitChange={(key, unit) => updateFilter(key, unit)}
        />
      ),
      timestamp: () => (
        <FiltersDrawerTimestampView
          from={filters.timestampFrom}
          to={filters.timestampTo}
          onChange={(key, value) => updateFilter(key, value)}
        />
      ),
    }),
    [filterSummaries, filters, updateFilter, onResetFilters, handleFiltersOpenChange],
  );

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
          <FamilyDrawerRoot key={filtersDrawerKey} open={isFiltersOpen} onOpenChange={handleFiltersOpenChange}>
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
                    <FamilyDrawerViewContent views={filterViews} />
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
