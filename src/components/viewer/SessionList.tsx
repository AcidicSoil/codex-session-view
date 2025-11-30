import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import { motion } from 'motion/react';
import { Copy, Search, SlidersHorizontal, X } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { ShimmerButton } from '~/components/ui/shimmer-button';
import { Loader } from '~/components/ui/loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Input } from '~/components/ui/input';
import { InputGroup, InputGroupText } from '~/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '~/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import type { RepoMetadata } from '~/lib/repo-metadata';
import { cn } from '~/lib/utils';
import { formatCount, formatDateTime } from '~/utils/intl';
import { BorderBeam } from '~/components/ui/border-beam';
import { TimelineView } from '~/components/viewer/TimelineView';
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger';
import { toast } from 'sonner';
import { HighlightedText } from '~/components/ui/highlighted-text';
import { buildSearchMatchers, matchesSearchMatchers, type SearchMatcher } from '~/utils/search';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '~/components/ui/command';
import { TracingBeam } from '~/components/aceternity/tracing-beam';
import { Separator } from '~/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '~/components/ui/accordion';

interface BranchGroup {
  id: string;
  name: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
}

interface RepositoryGroup {
  id: string;
  label: string;
  repoName: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
  repoMeta?: RepoMetadata;
  branches: BranchGroup[];
  branchCount: number;
  hasUnknownBranch: boolean;
}

export interface SessionListProps {
  sessionAssets: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
  onFiltersRender?: (node: ReactNode | null) => void;
}

const sessionCountIntensity = {
  low: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  medium: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-50',
  high: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50',
} as const;

type SizeUnit = 'KB' | 'MB';
type SortKey = 'timestamp' | 'size';
type SortDirection = 'asc' | 'desc';

interface SessionExplorerFilterState {
  searchText: string;
  sortKey: SortKey;
  sortDir: SortDirection;
  sizeMinValue: string;
  sizeMinUnit: SizeUnit;
  sizeMaxValue: string;
  sizeMaxUnit: SizeUnit;
  timestampFrom: string;
  timestampTo: string;
}

const defaultFilterState: SessionExplorerFilterState = {
  searchText: '',
  sortKey: 'timestamp',
  sortDir: 'desc',
  sizeMinValue: '',
  sizeMinUnit: 'MB',
  sizeMaxValue: '',
  sizeMaxUnit: 'MB',
  timestampFrom: '',
  timestampTo: '',
};

type FilterBadgeKey = 'size' | 'timestamp';

const SIZE_UNITS: SizeUnit[] = ['KB', 'MB'];

type SessionPreset = 'all' | 'recent' | 'heavy';

export function SessionList({
  sessionAssets,
  snapshotTimestamp,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onSelectionChange,
  onAddSessionToChat,
  onFiltersRender,
}: SessionListProps) {
  const [filters, setFilters] = useState<SessionExplorerFilterState>(defaultFilterState);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const [sessionPreset, setSessionPreset] = useState<SessionPreset>('all');
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false);
  const searchMatchers = useMemo(
    () => buildSearchMatchers(filters.searchText),
    [filters.searchText]
  );
  const quickFilterOptions = useMemo(
    () => [
      {
        key: 'week',
        label: 'Updated last 7 days',
        description: 'Shows sessions refreshed this week',
        apply: () => {
          const fromIso = toLocalDateTimeInput(snapshotTimestamp - 1000 * 60 * 60 * 24 * 7);
          setFilters((prev) => ({
            ...prev,
            timestampFrom: fromIso,
            timestampTo: '',
          }));
          setSessionPreset('recent');
        },
      },
      {
        key: 'compact',
        label: 'Smaller than 5 MB',
        description: 'Useful when scanning quick traces',
        apply: () => {
          setFilters((prev) => ({
            ...prev,
            sizeMinValue: '',
            sizeMaxValue: '5',
            sizeMaxUnit: 'MB',
          }));
          setSessionPreset('all');
        },
      },
      {
        key: 'clear',
        label: 'Clear quick filters',
        description: 'Reset preset overrides',
        apply: () => {
          setFilters((prev) => ({
            ...prev,
            sizeMinValue: '',
            sizeMaxValue: '',
            timestampFrom: '',
            timestampTo: '',
          }));
          setSessionPreset('all');
        },
      },
    ],
    [snapshotTimestamp]
  );
  const filterLogRef = useRef<{ modelKey: string; count: number }>({
    modelKey: '',
    count: sessionAssets.length,
  });
  const viewModelLogRef = useRef<{ total: number; groups: number } | null>(null);
  const sizeMinBytes = toBytes(filters.sizeMinValue, filters.sizeMinUnit);
  const sizeMaxBytes = toBytes(filters.sizeMaxValue, filters.sizeMaxUnit);
  const timestampFromMs = toTimestampMs(filters.timestampFrom);
  const timestampToMs = toTimestampMs(filters.timestampTo);
  const { sortKey, sortDir } = filters;
  const updateFilter = useCallback(
    <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    []
  );
  const applyPreset = useCallback(
    (value: SessionPreset) => {
      setSessionPreset(value);
      if (value === 'all') {
        setFilters((prev) => ({
          ...prev,
          timestampFrom: '',
          timestampTo: '',
          sizeMinValue: '',
          sizeMaxValue: '',
        }));
        return;
      }
      if (value === 'recent') {
        const fromIso = toLocalDateTimeInput(snapshotTimestamp - 1000 * 60 * 60 * 24 * 2);
        setFilters((prev) => ({
          ...prev,
          timestampFrom: fromIso,
          timestampTo: '',
        }));
        return;
      }
      if (value === 'heavy') {
        setFilters((prev) => ({
          ...prev,
          sizeMinValue: '25',
          sizeMinUnit: 'MB',
          sizeMaxValue: '',
        }));
      }
    },
    [snapshotTimestamp]
  );

  useEffect(() => {
    if (sizeMinBytes !== undefined && sizeMaxBytes !== undefined && sizeMinBytes > sizeMaxBytes) {
      logWarn('viewer.filters', 'Manual size range invalid', {
        sizeMinBytes,
        sizeMaxBytes,
      });
    }
  }, [sizeMinBytes, sizeMaxBytes]);

  useEffect(() => {
    if (timestampFromMs && timestampToMs && timestampFromMs > timestampToMs) {
      logWarn('viewer.filters', 'Timestamp range invalid', {
        timestampFromMs,
        timestampToMs,
      });
    }
  }, [timestampFromMs, timestampToMs]);

  const accessibleAssets = useMemo(
    () =>
      sessionAssets.filter(
        (asset) => typeof asset.url === 'string' && asset.url.includes('/api/uploads/')
      ),
    [sessionAssets]
  );

  const repositoryGroups = useMemo(
    () => aggregateByRepository(accessibleAssets),
    [accessibleAssets]
  );

  useEffect(() => {
    const repoCount = new Set(repositoryGroups.map((group) => group.repoName)).size;
    const modelKey = `${accessibleAssets.length}:${repositoryGroups.length}`;
    if (
      viewModelLogRef.current?.total === accessibleAssets.length &&
      viewModelLogRef.current?.groups === repositoryGroups.length
    ) {
      return;
    }
    logInfo('viewer.explorer', 'Computed session explorer view model', {
      totalSessions: accessibleAssets.length,
      repoCount,
      groupCount: repositoryGroups.length,
    });
    viewModelLogRef.current = { total: accessibleAssets.length, groups: repositoryGroups.length };
  }, [accessibleAssets.length, repositoryGroups]);

  const { groups: filteredGroups, filteredSessionCount } = useMemo(() => {
    const min = typeof sizeMinBytes === 'number' ? sizeMinBytes : undefined;
    const max = typeof sizeMaxBytes === 'number' ? sizeMaxBytes : undefined;
    const from = typeof timestampFromMs === 'number' ? timestampFromMs : undefined;
    const to = typeof timestampToMs === 'number' ? timestampToMs : undefined;
    const groups = repositoryGroups
      .map((group) => {
        const filteredBranches = group.branches
          .map((branch) => {
            const filteredSessions = branch.sessions.filter((session) => {
              const matchesSearch = searchMatchers.length
                ? matchesSearchText(searchMatchers, group, session)
                : true;
              if (!matchesSearch) return false;
              const size = session.size ?? 0;
              const meetsMin = min === undefined || size >= min;
              const meetsMax = max === undefined || size <= max;
              if (!meetsMin || !meetsMax) return false;
              const sessionTimestamp = session.sortKey ?? 0;
              const meetsFrom = from === undefined || sessionTimestamp >= from;
              const meetsTo = to === undefined || sessionTimestamp <= to;
              return meetsFrom && meetsTo;
            });
            if (!filteredSessions.length) return null;
            const sortedSessions = sortSessions(filteredSessions, sortKey, sortDir);
            return {
              ...branch,
              sessions: sortedSessions,
              primarySortValue: getSortValue(sortedSessions[0], sortKey),
            };
          })
          .filter(Boolean) as Array<BranchGroup & { primarySortValue: number }>;

        const branchDirection = sortDir === 'asc' ? 1 : -1;
        const sortedBranches = filteredBranches.sort((a, b) => {
          const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0);
          if (diff !== 0) return branchDirection * diff;
          return a.name.localeCompare(b.name);
        });

        if (!sortedBranches.length) return null;
        const flattenedSessions = sortedBranches.flatMap((branch) => branch.sessions);
        const primarySortValue =
          sortedBranches[0]?.primarySortValue ?? getSortValue(flattenedSessions[0], sortKey);
        const filteredNamedBranches = sortedBranches.filter(
          (branch) =>
            branch.name && branch.name.trim().length > 0 && branch.name.toLowerCase() !== 'unknown'
        );
        const branchCount = filteredNamedBranches.length;
        const hasUnknownBranch = sortedBranches.some(
          (branch) => branch.name.toLowerCase() === 'unknown'
        );
        return {
          ...group,
          sessions: flattenedSessions,
          branches: sortedBranches.map(({ primarySortValue: _p, ...rest }) => rest),
          branchCount,
          hasUnknownBranch,
          primarySortValue,
        };
      })
      .filter(Boolean) as Array<RepositoryGroup & { primarySortValue: number }>;

    const sortedGroups = groups.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1;
      const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0);
      if (diff !== 0) {
        return direction * diff;
      }
      return a.label.localeCompare(b.label);
    });

    const total = sortedGroups.reduce((count, group) => count + group.sessions.length, 0);
    return { groups: sortedGroups, filteredSessionCount: total };
  }, [
    repositoryGroups,
    searchMatchers,
    sizeMinBytes,
    sizeMaxBytes,
    sortKey,
    sortDir,
    timestampFromMs,
    timestampToMs,
  ]);

  useEffect(() => {
    const filterModel = buildFilterModel(filters, {
      sizeMinBytes,
      sizeMaxBytes,
      timestampFromMs,
      timestampToMs,
    });
    const modelKey = JSON.stringify(filterModel);
    if (
      filterLogRef.current.modelKey === modelKey &&
      filterLogRef.current.count === filteredSessionCount
    ) {
      return;
    }
    logInfo('viewer.filters', 'Session explorer filters updated', {
      filterModel,
      beforeCount: filterLogRef.current.count,
      afterCount: filteredSessionCount,
      navigation: 'local-state',
    });
    filterLogRef.current = { modelKey, count: filteredSessionCount };
  }, [filteredSessionCount, filters, sizeMaxBytes, sizeMinBytes, timestampFromMs, timestampToMs]);

  useEffect(() => {
    if (!selectedSessionPath) return;
    const stillVisible = filteredGroups.some((group) =>
      group.sessions.some((session) => session.path === selectedSessionPath)
    );
    if (!stillVisible) {
      const existsInMemory = accessibleAssets.some(
        (session) => session.path === selectedSessionPath
      );
      if (existsInMemory) {
        logDebug('viewer.explorer', 'Selected session hidden by filters', {
          selectedSessionPath,
          filterModel: buildFilterModel(filters, {
            sizeMinBytes,
            sizeMaxBytes,
            timestampFromMs,
            timestampToMs,
          }),
        });
        onSelectionChange?.(null);
      }
    }
  }, [
    filteredGroups,
    sizeMaxBytes,
    sizeMinBytes,
    onSelectionChange,
    filters,
    selectedSessionPath,
    accessibleAssets,
    timestampFromMs,
    timestampToMs,
  ]);

  useEffect(() => {
    const visibleIds = new Set(filteredGroups.map((group) => group.id));
    setExpandedGroupIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredGroups]);

  useEffect(() => {
    if (accessibleAssets.length > 0 && filteredSessionCount === 0) {
      const filterModel = buildFilterModel(filters, {
        sizeMinBytes,
        sizeMaxBytes,
        timestampFromMs,
        timestampToMs,
      });
      logError('viewer.explorer', 'Filters produced zero sessions while memory still populated', {
        filterModel,
        totalSessions: accessibleAssets.length,
        groupSamples: repositoryGroups.slice(0, 5).map((group) => group.id),
      });
    }
  }, [
    accessibleAssets.length,
    filteredSessionCount,
    filters,
    repositoryGroups,
    sizeMaxBytes,
    sizeMinBytes,
    timestampFromMs,
    timestampToMs,
  ]);

  const handleRepoToggle = (group: RepositoryGroup, shouldExpand: boolean) => {
    logDebug('viewer.explorer', 'Toggled repository group', {
      groupId: group.id,
      repoName: group.repoName,
      branchCount: group.branchCount,
      previousOpenState: !shouldExpand,
      nextOpenState: shouldExpand,
    });
    if (shouldExpand) {
      setLoadingRepoId(group.id);
      const simulatedDelay =
        group.sessions.length > 20 ? 400 : group.sessions.length > 8 ? 260 : 160;
      setTimeout(() => {
        setLoadingRepoId((current) => (current === group.id ? null : current));
      }, simulatedDelay);
    } else {
      setLoadingRepoId((current) => (current === group.id ? null : current));
    }
  };

  const handleAccordionChange = (nextValue: string[]) => {
    setExpandedGroupIds(nextValue);
    const added = nextValue.find((id) => !expandedGroupIds.includes(id));
    if (added) {
      const target = filteredGroups.find((group) => group.id === added);
      if (target) {
        handleRepoToggle(target, true);
      }
    }
    const removed = expandedGroupIds.find((id) => !nextValue.includes(id));
    if (removed) {
      const target = filteredGroups.find((group) => group.id === removed);
      if (target) {
        handleRepoToggle(target, false);
      }
    }
  };

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilterState });
    setExpandedGroupIds([]);
    setIsFilterSheetOpen(false);
    setSessionPreset('all');
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const activeBadges = useMemo(() => buildActiveFilterBadges(filters), [filters]);
  const handleBadgeClear = useCallback((badgeKey: FilterBadgeKey) => {
    setFilters((prev) => {
      if (badgeKey === 'size') {
        return { ...prev, sizeMinValue: '', sizeMaxValue: '' };
      }
      if (badgeKey === 'timestamp') {
        return { ...prev, timestampFrom: '', timestampTo: '' };
      }
      return prev;
    });
  }, []);

  const hasResults = filteredGroups.length > 0;
  const datasetEmpty = accessibleAssets.length === 0;

  const searchBar = useMemo(
    () => (
      <div className="w-full">
        <InputGroup className="w-full">
          <InputGroupText>
            <Search className="size-4" />
          </InputGroupText>
          <Input
            type="search"
            aria-label="Search sessions"
            value={filters.searchText}
            onChange={(event) => updateFilter('searchText', event.target.value)}
            placeholder="Search repo, branch, file label, tag, or year"
            className="border-0 focus-visible:ring-0"
          />
        </InputGroup>
      </div>
    ),
    [filters.searchText, updateFilter]
  );

  const filterToolbar = useMemo(
    () => (
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
            <Select
              value={filters.sortKey}
              onValueChange={(value: SortKey) => updateFilter('sortKey', value)}
            >
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
            <Popover open={isQuickFilterOpen} onOpenChange={setIsQuickFilterOpen}>
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
                            setIsQuickFilterOpen(false);
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
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={() => setIsFilterSheetOpen(true)}
            >
              Advanced
            </Button>
            <Button type="button" variant="ghost" onClick={resetFilters}>
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
              <Badge
                key={badge.key}
                variant="secondary"
                className="flex items-center gap-2 whitespace-nowrap"
              >
                {badge.label}
                <button
                  type="button"
                  aria-label={`Clear ${badge.description}`}
                  onClick={() => handleBadgeClear(badge.key)}
                  className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </div>
    ),
    [
      activeBadges,
      applyPreset,
      filters,
      handleBadgeClear,
      isQuickFilterOpen,
      quickFilterOptions,
      resetFilters,
      sessionPreset,
      updateFilter,
    ]
  );

  useEffect(() => {
    if (!onFiltersRender) return;
    onFiltersRender(filterToolbar);
    return () => onFiltersRender(null);
  }, [filterToolbar, onFiltersRender]);

  return (
    <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
      <div className="w-full">
        <Card className="flex min-h-[70vh] flex-col overflow-hidden p-0">
          <CardHeader className="space-y-4 border-b border-border/80 px-6 py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-semibold">Session explorer</CardTitle>
                <CardDescription>
                  Discover JSONL session logs grouped by repository and branch.
                </CardDescription>
              </div>
              <Badge
                variant="secondary"
                className="text-[10px] font-semibold uppercase tracking-wide"
              >
                {formatCount(filteredSessionCount)} / {formatCount(accessibleAssets.length)}{' '}
                sessions
              </Badge>
            </div>
            {/* Search Bar Moved into Banner (CardHeader) */}
            {searchBar}
            {onFiltersRender ? null : filterToolbar}
            {activeBadges.length ? (
              <div
                className="flex flex-nowrap gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible"
                data-testid="active-filter-badges"
              >
                {activeBadges.map((badge) => (
                  <Badge
                    key={badge.key}
                    variant="secondary"
                    className="flex items-center gap-2 whitespace-nowrap"
                  >
                    {badge.label}
                    <button
                      type="button"
                      aria-label={`Clear ${badge.description}`}
                      onClick={() => handleBadgeClear(badge.key)}
                      className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-1 flex-col overflow-hidden px-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Session repositories
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCount(filteredGroups.length)} grouped results
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                Snapshot {formatDateTime(snapshotTimestamp, { fallback: 'N/A' })}
              </Badge>
            </div>
            <Separator className="mx-6 my-3" />
            <TracingBeam outerClassName="flex-1" className="px-6 pb-6">
              <div className="space-y-4 pr-2" aria-live="polite">
                {!hasResults ? (
                  <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-6 text-center">
                    <p className="text-sm font-semibold">
                      {datasetEmpty
                        ? 'No session logs discovered yet.'
                        : 'No repositories match the selected filters.'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {datasetEmpty
                        ? 'Drop JSONL exports or point the viewer to a sessions directory to populate this view.'
                        : 'Adjust or clear filters to explore all session logs.'}
                    </p>
                  </div>
                ) : (
                  <Accordion
                    type="multiple"
                    value={expandedGroupIds}
                    onValueChange={(value) =>
                      handleAccordionChange(Array.isArray(value) ? value : [value])
                    }
                    className="space-y-4"
                  >
                    {filteredGroups.map((repo, index) => {
                      const intentClass = getSessionChipIntent(repo.sessions.length);
                      return (
                        <div key={repo.id}>
                          <AccordionItem value={repo.id} className="border-0">
                            <AccordionTrigger
                              aria-label={`Toggle ${repo.label} repository`}
                              className={cn(
                                'rounded-2xl border border-transparent px-4 py-3 text-left transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-ring',
                                intentClass,
                                'data-[state=open]:shadow-sm'
                              )}
                            >
                              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex flex-wrap items-center gap-3">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="cursor-default text-xs font-semibold uppercase tracking-wide"
                                      >
                                        <HighlightedText
                                          text={repo.label}
                                          matchers={searchMatchers}
                                        />
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <HighlightedText
                                        as="p"
                                        className="text-xs font-semibold"
                                        text={repo.label}
                                        matchers={searchMatchers}
                                      />
                                      <p className="text-xs opacity-80">
                                        Repo:{' '}
                                        <HighlightedText
                                          text={repo.repoName}
                                          matchers={searchMatchers}
                                        />
                                      </p>
                                      <p className="text-xs opacity-80">
                                        Branches:{' '}
                                        <HighlightedText
                                          text={`${describeBranches(repo.branches)} (${repo.branchCount}${repo.hasUnknownBranch ? '*' : ''})`}
                                          matchers={searchMatchers}
                                        />
                                      </p>
                                      <p className="text-xs opacity-80">
                                        Total size: {formatBytes(repo.totalSize)}
                                      </p>
                                      <p className="text-xs opacity-80">
                                        Last updated: {formatDate(repo.lastUpdated)}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-semibold uppercase tracking-wide"
                                  >
                                    {formatCount(repo.sessions.length)}{' '}
                                    {repo.sessions.length === 1 ? 'session' : 'sessions'}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] font-semibold uppercase tracking-wide"
                                  >
                                    Branches {formatCount(repo.branchCount)}
                                    {repo.hasUnknownBranch ? '*' : ''}
                                  </Badge>
                                </div>
                                <div className="text-right text-xs text-muted-foreground">
                                  <p>{formatBytes(repo.totalSize)}</p>
                                  <p>
                                    Updated{' '}
                                    {formatRelativeTime(repo.lastUpdated, snapshotTimestamp)}
                                  </p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent>
                              <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 px-4 py-4">
                                {loadingRepoId === repo.id ? (
                                  <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                                    <Loader className="size-4" aria-label="Loading sessions" />
                                    Preparing session list…
                                  </div>
                                ) : (
                                  repo.branches.map((branch, branchIndex) => (
                                    <div key={branch.id} className="space-y-2">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide">
                                          Branch{' '}
                                          <HighlightedText
                                            text={branch.name}
                                            matchers={searchMatchers}
                                          />
                                        </p>
                                        <span className="text-xs text-muted-foreground">
                                          {formatCount(branch.sessions.length)}{' '}
                                          {branch.sessions.length === 1 ? 'session' : 'sessions'}
                                        </span>
                                      </div>
                                      <SessionRepoVirtualList
                                        sessions={branch.sessions}
                                        snapshotTimestamp={snapshotTimestamp}
                                        onSessionOpen={(session) => {
                                          onSelectionChange?.(session.path);
                                          return onSessionOpen?.(session);
                                        }}
                                        loadingSessionPath={loadingSessionPath}
                                        selectedSessionPath={selectedSessionPath}
                                        onAddSessionToChat={onAddSessionToChat}
                                        searchMatchers={searchMatchers}
                                      />
                                      {branchIndex < repo.branches.length - 1 ? (
                                        <Separator className="my-1 opacity-40" />
                                      ) : null}
                                    </div>
                                  ))
                                )}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                          {index < filteredGroups.length - 1 ? (
                            <Separator className="my-2 opacity-50" />
                          ) : null}
                        </div>
                      );
                    })}
                  </Accordion>
                )}
              </div>
            </TracingBeam>
          </CardContent>
        </Card>
      </div>
      <SheetContent side="right" className="w-full space-y-6 overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Advanced filters</SheetTitle>
          <SheetDescription>
            Configure the v1 advanced filters (size range & timestamp range).
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold">Size range</p>
            <p className="text-xs text-muted-foreground">
              Limit sessions by minimum and maximum file size.
            </p>
            <div className="space-y-3">
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-size-min"
                >
                  Minimum size
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="filter-size-min"
                    type="number"
                    min={0}
                    value={filters.sizeMinValue}
                    onChange={(event) => updateFilter('sizeMinValue', event.target.value)}
                    placeholder="e.g. 10"
                  />
                  <Select
                    value={filters.sizeMinUnit}
                    onValueChange={(value: SizeUnit) => updateFilter('sizeMinUnit', value)}
                  >
                    <SelectTrigger aria-label="Minimum size unit" className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {SIZE_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-size-max"
                >
                  Maximum size
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="filter-size-max"
                    type="number"
                    min={0}
                    value={filters.sizeMaxValue}
                    onChange={(event) => updateFilter('sizeMaxValue', event.target.value)}
                    placeholder="e.g. 100"
                  />
                  <Select
                    value={filters.sizeMaxUnit}
                    onValueChange={(value: SizeUnit) => updateFilter('sizeMaxUnit', value)}
                  >
                    <SelectTrigger aria-label="Maximum size unit" className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="end">
                      {SIZE_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Timestamp range</p>
            <p className="text-xs text-muted-foreground">
              Filter sessions by when they were last updated.
            </p>
            <div className="grid gap-3">
              <div className="space-y-1">
                <label
                  className="text-xs font-medium text-muted-foreground"
                  htmlFor="filter-ts-from"
                >
                  Start (UTC)
                </label>
                <Input
                  id="filter-ts-from"
                  type="datetime-local"
                  value={filters.timestampFrom}
                  onChange={(event) => updateFilter('timestampFrom', event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-ts-to">
                  End (UTC)
                </label>
                <Input
                  id="filter-ts-to"
                  type="datetime-local"
                  value={filters.timestampTo}
                  onChange={(event) => updateFilter('timestampTo', event.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
        <SheetFooter>
          <Button variant="ghost" onClick={resetFilters}>
            Reset all
          </Button>
          <Button variant="secondary" onClick={() => setIsFilterSheetOpen(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function aggregateByRepository(sessionAssets: DiscoveredSessionAsset[]): RepositoryGroup[] {
  type RepoAccumulator = {
    group: RepositoryGroup;
    branches: Map<string, BranchGroup>;
  };
  const map = new Map<string, RepoAccumulator>();
  for (const asset of sessionAssets) {
    const repoName = cleanRepoName(asset.repoName);
    const repoKey = repoName.toLowerCase();
    let accumulator = map.get(repoKey);
    if (!accumulator) {
      const id = slugify(repoName);
      accumulator = {
        group: {
          id,
          label: repoName,
          repoName,
          sessions: [],
          totalSize: 0,
          lastUpdated: asset.sortKey,
          repoMeta: asset.repoMeta,
          branches: [],
        },
        branches: new Map(),
      };
      map.set(repoKey, accumulator);
    }
    const repo = accumulator.group;
    repo.sessions.push(asset);
    repo.totalSize += asset.size ?? 0;
    repo.lastUpdated = Math.max(repo.lastUpdated ?? 0, asset.sortKey ?? 0) || repo.lastUpdated;
    if (!repo.repoMeta && asset.repoMeta) {
      repo.repoMeta = asset.repoMeta;
    }

    const branchName = asset.branch && asset.branch !== 'unknown' ? asset.branch : 'Unknown';
    const branchKey = branchName.toLowerCase();
    let branch = accumulator.branches.get(branchKey);
    if (!branch) {
      branch = {
        id: `${repo.id}-${slugify(branchName)}`,
        name: branchName,
        sessions: [],
        totalSize: 0,
        lastUpdated: asset.sortKey,
      };
      accumulator.branches.set(branchKey, branch);
    }
    branch.sessions.push(asset);
    branch.totalSize += asset.size ?? 0;
    branch.lastUpdated =
      Math.max(branch.lastUpdated ?? 0, asset.sortKey ?? 0) || branch.lastUpdated;
  }

  return Array.from(map.values()).map(({ group, branches }) => {
    const sortedBranches = Array.from(branches.values()).sort(
      (a, b) => (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0) || a.name.localeCompare(b.name)
    );
    const namedBranches = sortedBranches.filter(
      (branch) =>
        branch.name && branch.name.trim().length > 0 && branch.name.toLowerCase() !== 'unknown'
    );
    const branchCount = namedBranches.length;
    const hasUnknownBranch = sortedBranches.some(
      (branch) => branch.name.toLowerCase() === 'unknown'
    );
    return {
      ...group,
      branches: sortedBranches,
      branchCount,
      hasUnknownBranch,
    };
  });
}

function matchesSearchText(
  matchers: SearchMatcher[],
  group: RepositoryGroup,
  session: DiscoveredSessionAsset
) {
  if (!matchers.length) return true;
  const branchNames = group.branches.map((branch) => branch.name).join(' ');
  const haystack = [
    group.repoName,
    branchNames,
    session.repoLabel,
    session.repoName,
    session.branch,
    session.displayLabel,
    session.path,
    session.tags?.join(' '),
  ]
    .filter(Boolean)
    .join(' ');
  if (!haystack.trim()) return false;
  return matchesSearchMatchers(haystack, matchers);
}

function describeBranches(branches: BranchGroup[]) {
  if (!branches.length) return 'Unknown';
  const names = branches.map((branch) => branch.name);
  if (names.length <= 3) {
    return names.join(', ');
  }
  const preview = names.slice(0, 3).join(', ');
  return `${preview} +${names.length - 3}`;
}

function sortSessions(
  sessions: DiscoveredSessionAsset[],
  sortKey: SortKey,
  sortDir: SortDirection
) {
  const direction = sortDir === 'asc' ? 1 : -1;
  return [...sessions].sort((a, b) => {
    const diff = (getSortValue(a, sortKey) ?? 0) - (getSortValue(b, sortKey) ?? 0);
    if (diff !== 0) {
      return direction * diff;
    }
    return a.path.localeCompare(b.path);
  });
}

function getSortValue(session: DiscoveredSessionAsset, sortKey: SortKey) {
  if (sortKey === 'size') {
    return session.size ?? 0;
  }
  return session.sortKey ?? 0;
}

function toBytes(value: string, unit: SizeUnit) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  const multiplier = unit === 'KB' ? 1024 : 1024 * 1024;
  return parsed * multiplier;
}

function toTimestampMs(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toLocalDateTimeInput(ms: number) {
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms);
  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function buildFilterModel(
  state: SessionExplorerFilterState,
  derived: {
    sizeMinBytes?: number;
    sizeMaxBytes?: number;
    timestampFromMs?: number;
    timestampToMs?: number;
  }
) {
  return {
    textQuery: state.searchText.trim() || null,
    sizeMinBytes: derived.sizeMinBytes ?? null,
    sizeMaxBytes: derived.sizeMaxBytes ?? null,
    timestampFrom: derived.timestampFromMs ?? null,
    timestampTo: derived.timestampToMs ?? null,
    sortKey: state.sortKey,
    sortOrder: state.sortDir,
    repoFilter: null,
    branchFilter: null,
  };
}

function buildActiveFilterBadges(state: SessionExplorerFilterState) {
  const badges: Array<{ key: FilterBadgeKey; label: string; description: string }> = [];
  if (state.sizeMinValue.trim() || state.sizeMaxValue.trim()) {
    const minLabel = state.sizeMinValue.trim() ? `${state.sizeMinValue} ${state.sizeMinUnit}` : '0';
    const maxLabel = state.sizeMaxValue.trim() ? `${state.sizeMaxValue} ${state.sizeMaxUnit}` : '∞';
    badges.push({
      key: 'size',
      label: `Size: ${minLabel} – ${maxLabel}`,
      description: 'size filter',
    });
  }
  if (state.timestampFrom.trim() || state.timestampTo.trim()) {
    const fromLabel = state.timestampFrom
      ? formatDateTime(state.timestampFrom, { fallback: 'Any' })
      : 'Any';
    const toLabel = state.timestampTo
      ? formatDateTime(state.timestampTo, { fallback: 'Any' })
      : 'Any';
    badges.push({
      key: 'timestamp',
      label: `Updated: ${fromLabel} → ${toLabel}`,
      description: 'timestamp filter',
    });
  }
  return badges;
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'session-repo';
}

function getSessionChipIntent(count: number) {
  if (count <= 2) return sessionCountIntensity.low;
  if (count <= 5) return sessionCountIntensity.medium;
  return sessionCountIntensity.high;
}

function formatBytes(value?: number) {
  if (!value) return 'Unknown size';
  const units = ['B', 'KB', 'MB', 'GB'];
  let idx = 0;
  let size = value;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx += 1;
  }
  return `${size.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatDate(value?: number) {
  if (!value) return 'Unknown date';
  return formatDateTime(value);
}

function formatRelativeTime(value: number | undefined, referenceMs: number) {
  if (!value) return 'never';
  const deltaMs = Math.max(referenceMs - value, 0);
  const minutes = Math.round(deltaMs / (1000 * 60));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 60) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}

interface SessionTimelineItem {
  session: DiscoveredSessionAsset;
  index: number;
}

function SessionRepoVirtualList({
  sessions,
  snapshotTimestamp,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onAddSessionToChat,
  searchMatchers,
}: {
  sessions: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
  searchMatchers?: SearchMatcher[];
}) {
  const items = useMemo<SessionTimelineItem[]>(
    () => sessions.map((session, index) => ({ session, index })),
    [sessions]
  );
  const [gradients, setGradients] = useState({ top: 0, bottom: 0 });
  const viewportHeight = items.length ? Math.max(Math.min(items.length * 96, 520), 220) : 200;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-background/70">
      <TimelineView
        items={items}
        height={viewportHeight}
        estimateItemHeight={104}
        overscanPx={200}
        keyForIndex={(item) => `${item.session.path}:${item.index}`}
        onScrollChange={({ scrollTop, totalHeight, height }) => {
          const top = Math.min(scrollTop / 80, 1);
          const bottomDistance = totalHeight - (scrollTop + height);
          const bottom = totalHeight <= height ? 0 : Math.min(bottomDistance / 80, 1);
          setGradients({ top, bottom });
        }}
        renderItem={(item) => (
          <motion.div
            className="px-3 pb-4 pt-2"
            initial={{ opacity: 0.6, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <SessionCard
              session={item.session}
              snapshotTimestamp={snapshotTimestamp}
              onSessionOpen={onSessionOpen}
              isLoading={loadingSessionPath === item.session.path}
              isSelected={selectedSessionPath === item.session.path}
              onAddToChat={onAddSessionToChat}
              searchMatchers={searchMatchers}
            />
          </motion.div>
        )}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-background to-transparent"
        style={{ opacity: gradients.top }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent"
        style={{ opacity: gradients.bottom }}
      />
    </div>
  );
}

function SessionCard({
  session,
  snapshotTimestamp,
  onSessionOpen,
  isLoading,
  isSelected,
  onAddToChat,
  searchMatchers,
}: {
  session: DiscoveredSessionAsset;
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  isLoading?: boolean;
  isSelected?: boolean;
  onAddToChat?: (asset: DiscoveredSessionAsset) => void;
  searchMatchers?: SearchMatcher[];
}) {
  const displayName = session.displayLabel;
  const repoLabel = session.repoLabel ?? session.repoName;
  const branchName = session.repoMeta?.branch ?? session.branch;
  const repoDisplay =
    session.repoName && session.repoName !== 'unknown-repo' ? session.repoName : null;
  const branchDisplay = branchName && branchName !== 'unknown' ? branchName : null;
  const sessionId = extractSessionId(displayName) ?? extractSessionId(session.path);
  const branchLine = branchDisplay ? `Branch ${branchDisplay}` : '';
  const commitLine = session.repoMeta?.commit
    ? `Commit ${formatCommit(session.repoMeta.commit)}`
    : '';
  const branchMeta = [branchLine, commitLine].filter(Boolean).join(' · ');

  const handleCopySessionId = async () => {
    if (!sessionId || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success('Copied session ID', { description: sessionId });
      logInfo('viewer.explorer', 'Copied session id', { path: session.path, sessionId });
    } catch (error) {
      toast.error('Failed to copy session ID');
      logError(
        'viewer.explorer',
        'Copy session id failed',
        error instanceof Error ? error : new Error('unknown error')
      );
    }
  };
  const handleAddToChat = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onAddToChat?.(session);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background via-background/60 to-muted/40 p-4',
        isSelected && 'border-primary/60 ring-2 ring-primary/50'
      )}
    >
      <BorderBeam className="opacity-50" size={120} duration={8} borderWidth={1} />
      <div className="relative z-10 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {repoLabel ? (
              <HighlightedText
                as="p"
                className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300"
                text={repoLabel}
                matchers={searchMatchers}
              />
            ) : null}
            {repoDisplay ? (
              <HighlightedText
                as="p"
                className="truncate text-[11px] text-muted-foreground"
                text={repoDisplay}
                matchers={searchMatchers}
              />
            ) : null}
            {branchMeta ? (
              <HighlightedText
                as="p"
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                text={branchMeta}
                matchers={searchMatchers}
              />
            ) : null}
            <HighlightedText
              as="p"
              className="truncate text-sm font-semibold text-foreground"
              text={displayName}
              matchers={searchMatchers}
            />
            <HighlightedText
              as="p"
              className="truncate text-xs text-muted-foreground"
              text={session.path}
              matchers={searchMatchers}
            />
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{formatBytes(session.size)}</p>
            {session.lastModifiedIso ? (
              <p
                className="font-mono text-[10px] uppercase tracking-tight text-muted-foreground"
                aria-label="Last modified timestamp"
              >
                {session.lastModifiedIso}
              </p>
            ) : null}
            <p>{formatRelativeTime(session.sortKey, snapshotTimestamp)}</p>
            {isSelected ? (
              <span className="mt-1 inline-flex rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                Selected
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {session.tags?.slice(0, 3).map((tag) => (
            <span
              key={`${session.path}-${tag}`}
              className="rounded-full border border-border/70 px-2 py-0.5"
            >
              <HighlightedText text={tag} matchers={searchMatchers} />
            </span>
          ))}
          {session.tags && session.tags.length > 3 ? <span>+{session.tags.length - 3}</span> : null}
          <div className="ml-auto flex items-center gap-2">
            {sessionId ? (
              <Button type="button" size="sm" variant="outline" onClick={handleCopySessionId}>
                <Copy className="mr-1 size-4" />
                Copy ID
              </Button>
            ) : null}
            <ShimmerButton
              type="button"
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
              onClick={handleAddToChat}
            >
              Add to chat
            </ShimmerButton>
            {onSessionOpen ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isLoading}
                onClick={() => onSessionOpen(session)}
              >
                {isLoading ? 'Loading…' : 'Load session'}
              </Button>
            ) : null}
            <a
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              href={session.url}
              target="_blank"
              rel="noreferrer"
            >
              Open file
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatCommit(commit: string) {
  return commit.length > 8 ? commit.slice(0, 8) : commit;
}

function extractSessionId(label?: string | null) {
  if (!label) return null;
  const match = label.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

function cleanRepoName(name?: string | null) {
  if (!name) return 'Unknown repo';
  const normalized = name.trim();
  if (!normalized || normalized.toLowerCase() === 'src') {
    return 'Unknown repo';
  }
  if (/^\d+$/.test(normalized)) {
    return 'Unknown repo';
  }
  if (/^[0-9a-f-]{6,}$/i.test(normalized) && !normalized.includes('/')) {
    return 'Unknown repo';
  }
  return normalized;
}
