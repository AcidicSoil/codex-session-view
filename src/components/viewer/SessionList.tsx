import { type ReactNode, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { TracingBeam } from '~/components/aceternity/tracing-beam';
import { MeteorsField } from '~/components/aceternity/meteors';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { formatCount, formatDateTime } from '~/utils/intl';
import { SessionFiltersToolbar } from '~/components/viewer/session-list/SessionFiltersToolbar';
import { SessionRepositoryAccordion } from '~/components/viewer/session-list/SessionRepositoryAccordion';
import { SessionSearchBar } from '~/components/viewer/session-list/SessionSearchBar';
import { useSessionExplorerModel } from '~/components/viewer/session-list/useSessionExplorerModel';

export interface SessionListProps {
  sessionAssets: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
  onFiltersRender?: (node: ReactNode | null) => void;
  uploadSlot?: ReactNode;
}

export function SessionList({
  sessionAssets,
  snapshotTimestamp,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onSelectionChange,
  onAddSessionToChat,
  onFiltersRender,
  uploadSlot,
}: SessionListProps) {
  const {
    filters,
    updateFilter,
    updateFilters,
    resetFilters,
    activeBadges,
    handleBadgeClear,
    accessibleAssets,
    filteredGroups,
    filteredSessionCount,
    datasetEmpty,
    expandedGroupIds,
    handleAccordionChange,
    loadingRepoId,
    hasResults,
    searchMatchers,
    filterDimensions,
  } = useSessionExplorerModel({
    sessionAssets,
    snapshotTimestamp,
    selectedSessionPath,
    onSelectionChange,
  });

  const filterToolbarNode = useMemo(
    () => (
      <SessionFiltersToolbar
        filters={filters}
        updateFilter={updateFilter}
        updateFilters={updateFilters}
        onResetFilters={resetFilters}
        activeBadges={activeBadges}
        onBadgeClear={handleBadgeClear}
        filterDimensions={filterDimensions}
      />
    ),
    [
      activeBadges,
      handleBadgeClear,
      filterDimensions,
      filters,
      resetFilters,
      updateFilters,
      updateFilter,
    ]
  );

  useEffect(() => {
    if (!onFiltersRender) return;
    onFiltersRender(filterToolbarNode);
    return () => onFiltersRender(null);
  }, [filterToolbarNode, onFiltersRender]);

  const shouldRenderInlineFilters = !onFiltersRender;

  return (
    <MeteorsField className="w-full">
      <Card className="flex min-h-[70vh] flex-col overflow-hidden border border-white/10 bg-black/70 p-0 backdrop-blur-xl">
        <CardHeader className="space-y-4 border-b border-border/80 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-white">Session explorer</CardTitle>
              <CardDescription className="text-sm text-white/60">
                Discover JSONL session logs grouped by repository and branch.
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SessionSearchBar filters={filters} updateFilter={updateFilter} className="sm:w-72" />
              <Badge variant="secondary" className="justify-center text-[10px] font-semibold uppercase tracking-wide">
                {formatCount(filteredSessionCount)} / {formatCount(accessibleAssets.length)} sessions
              </Badge>
            </div>
          </div>
          {shouldRenderInlineFilters ? filterToolbarNode : null}
        </CardHeader>
        {uploadSlot ? <div className="px-6 py-4">{uploadSlot}</div> : null}
        <CardContent className="flex flex-1 flex-col overflow-hidden px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Session repositories
              </p>
              <p className="text-xs text-muted-foreground">{formatCount(filteredGroups.length)} grouped results</p>
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Snapshot {formatDateTime(snapshotTimestamp, { fallback: 'N/A' })}
            </Badge>
          </div>
          <Separator className="mx-6 my-3" />
          <TracingBeam outerClassName="flex-1" className="px-6 pb-6">
            <div className="space-y-4 pr-2" aria-live="polite">
              {!hasResults ? (
                <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
                  <p className="text-sm font-semibold">
                    {datasetEmpty ? 'No session logs discovered yet.' : 'No repositories match the selected filters.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {datasetEmpty
                      ? 'Drop JSONL exports or point the viewer to a sessions directory to populate this view.'
                      : 'Adjust or clear filters to explore all session logs.'}
                  </p>
                </div>
              ) : (
                <SessionRepositoryAccordion
                  groups={filteredGroups}
                  expandedIds={expandedGroupIds}
                  onAccordionChange={handleAccordionChange}
                  loadingRepoId={loadingRepoId}
                  snapshotTimestamp={snapshotTimestamp}
                  searchMatchers={searchMatchers}
                  onSessionOpen={onSessionOpen}
                  loadingSessionPath={loadingSessionPath}
                  selectedSessionPath={selectedSessionPath}
                  onSelectionChange={onSelectionChange}
                  onAddSessionToChat={onAddSessionToChat}
                />
              )}
            </div>
          </TracingBeam>
        </CardContent>
      </Card>
    </MeteorsField>
  );
}
