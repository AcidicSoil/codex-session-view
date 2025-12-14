import { type ReactNode, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Separator } from '~/components/ui/separator';
import { TracingBeam } from '~/components/aceternity/tracing-beam';
import { MeteorsField } from '~/components/aceternity/meteors';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { formatCount, formatDateTime } from '~/utils/intl';
import { SessionRepositoryAccordion } from '~/components/viewer/session-list/SessionRepositoryAccordion';
import { SessionExplorerToolbar } from '~/components/viewer/session-list/SessionExplorerToolbar';
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
  uploadDrawerContent?: ReactNode;
  onSessionEject?: () => void;
  isSessionEjecting?: boolean;
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
  uploadDrawerContent,
  onSessionEject,
  isSessionEjecting,
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
      <SessionExplorerToolbar
        filters={filters}
        updateFilter={updateFilter}
        updateFilters={updateFilters}
        onResetFilters={resetFilters}
        activeBadges={activeBadges}
        onBadgeClear={handleBadgeClear}
        filterDimensions={filterDimensions}
        filteredSessionCount={filteredSessionCount}
        totalSessionCount={accessibleAssets.length}
        uploadDrawerContent={uploadDrawerContent}
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
      filteredSessionCount,
      accessibleAssets.length,
      uploadDrawerContent,
    ]
  );

  useEffect(() => {
    if (!onFiltersRender) return;
    onFiltersRender(filterToolbarNode);
    return () => onFiltersRender(null);
  }, [filterToolbarNode, onFiltersRender]);

  const shouldRenderInlineToolbar = !onFiltersRender;

  return (
    <MeteorsField className="w-full">
      <Card className="flex min-h-[70vh] flex-col overflow-hidden border border-white/10 bg-black/70 p-0 backdrop-blur-xl">
        <CardHeader className="space-y-4 border-b border-border/80 px-6 py-5">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-white">Session explorer</CardTitle>
            <CardDescription className="text-sm text-white/60">
              Discover JSONL session logs grouped by repository and branch.
            </CardDescription>
          </div>
          {shouldRenderInlineToolbar ? filterToolbarNode : null}
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden px-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Session repositories
              </p>
              <p className="text-xs text-muted-foreground">{formatCount(filteredGroups.length)} grouped results</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Snapshot {formatDateTime(snapshotTimestamp, { fallback: 'N/A' })}
              </Badge>
              {selectedSessionPath ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!onSessionEject || isSessionEjecting}
                  onClick={onSessionEject}
                >
                  {isSessionEjecting ? 'Ejecting…' : 'Eject session'}
                </Button>
              ) : null}
            </div>
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
