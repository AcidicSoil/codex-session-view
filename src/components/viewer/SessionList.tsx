import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowDownUp, Search, SlidersHorizontal } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Loader } from '~/components/ui/loader';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import type { RepoMetadata } from '~/lib/repo-metadata';
import { cn } from '~/lib/utils';
import { formatCount, formatDateTime } from '~/utils/intl';
import { BorderBeam } from '~/components/ui/border-beam';
import { TimelineView } from '~/components/viewer/TimelineView';
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger';

interface RepositoryGroup {
  id: string;
  label: string;
  repoName: string;
  branchName: string;
  commit?: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
  repoMeta?: RepoMetadata;
}

export interface SessionListProps {
  sessionAssets: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
}

const sessionCountIntensity = {
  low: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  medium: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-50',
  high: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50',
} as const;

const SIZE_PRESETS = {
  any: { id: 'any', label: 'Size: any', minBytes: undefined },
  'over-512kb': { id: 'over-512kb', label: '> 512 KB', minBytes: 512 * 1024 },
  'over-1mb': { id: 'over-1mb', label: '> 1 MB', minBytes: 1024 * 1024 },
  'over-10mb': { id: 'over-10mb', label: '> 10 MB', minBytes: 10 * 1024 * 1024 },
} as const;

type SizePresetId = keyof typeof SIZE_PRESETS;
type SizeUnit = 'KB' | 'MB';
type SortKey = 'timestamp' | 'size';
type SortDirection = 'asc' | 'desc';

export function SessionList({
  sessionAssets,
  snapshotTimestamp,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onSelectionChange,
}: SessionListProps) {
  const [searchText, setSearchText] = useState('');
  const [sizePreset, setSizePreset] = useState<SizePresetId>('any');
  const [manualMinValue, setManualMinValue] = useState('');
  const [manualMaxValue, setManualMaxValue] = useState('');
  const [manualMinUnit, setManualMinUnit] = useState<SizeUnit>('MB');
  const [manualMaxUnit, setManualMaxUnit] = useState<SizeUnit>('MB');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const filterLogRef = useRef<{ modelKey: string; count: number }>({ modelKey: '', count: sessionAssets.length });
  const viewModelLogRef = useRef<{ total: number; groups: number } | null>(null);

  const manualMinBytes = toBytes(manualMinValue, manualMinUnit);
  const manualMaxBytes = toBytes(manualMaxValue, manualMaxUnit);
  const presetMinBytes = SIZE_PRESETS[sizePreset].minBytes;
  const hasManualRange = manualMinBytes !== undefined || manualMaxBytes !== undefined;
  const effectiveMinBytes = hasManualRange ? manualMinBytes : presetMinBytes;
  const effectiveMaxBytes = hasManualRange ? manualMaxBytes : undefined;

  useEffect(() => {
    if (
      manualMinBytes !== undefined &&
      manualMaxBytes !== undefined &&
      manualMinBytes > manualMaxBytes
    ) {
      logWarn('viewer.filters', 'Manual size range invalid', {
        manualMinBytes,
        manualMaxBytes,
      });
    }
  }, [manualMinBytes, manualMaxBytes]);

  const repositoryGroups = useMemo(
    () => aggregateByRepository(sessionAssets),
    [sessionAssets],
  );

  useEffect(() => {
    const repoCount = new Set(repositoryGroups.map((group) => group.repoName)).size;
    const modelKey = `${sessionAssets.length}:${repositoryGroups.length}`;
    if (viewModelLogRef.current?.total === sessionAssets.length && viewModelLogRef.current?.groups === repositoryGroups.length) {
      return;
    }
    logInfo('viewer.explorer', 'Computed session explorer view model', {
      totalSessions: sessionAssets.length,
      repoCount,
      groupCount: repositoryGroups.length,
    });
    viewModelLogRef.current = { total: sessionAssets.length, groups: repositoryGroups.length };
  }, [sessionAssets.length, repositoryGroups]);

  const { groups: filteredGroups, filteredSessionCount } = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    const min = typeof effectiveMinBytes === 'number' ? effectiveMinBytes : undefined;
    const max = typeof effectiveMaxBytes === 'number' ? effectiveMaxBytes : undefined;
    const groups = repositoryGroups
      .map((group) => {
        const filteredSessions = group.sessions.filter((session) => {
          const matchesSearch = query
            ? matchesSearchText(query, group, session)
            : true;
          if (!matchesSearch) return false;
          const size = session.size ?? 0;
          const meetsMin = min === undefined || size >= min;
          const meetsMax = max === undefined || size <= max;
          return meetsMin && meetsMax;
        });
        if (!filteredSessions.length) return null;
        const sortedSessions = sortSessions(filteredSessions, sortKey, sortDir);
        return {
          ...group,
          sessions: sortedSessions,
          primarySortValue: getSortValue(sortedSessions[0], sortKey),
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
  }, [repositoryGroups, searchText, effectiveMinBytes, effectiveMaxBytes, sortKey, sortDir]);

  useEffect(() => {
    const filterModel = buildFilterModel({
      searchText,
      sizePreset,
      manualMinBytes,
      manualMaxBytes,
      sortKey,
      sortDir,
    });
    const modelKey = JSON.stringify(filterModel);
    if (filterLogRef.current.modelKey === modelKey && filterLogRef.current.count === filteredSessionCount) {
      return;
    }
    logInfo('viewer.filters', 'Session explorer filters updated', {
      filterModel,
      beforeCount: filterLogRef.current.count,
      afterCount: filteredSessionCount,
      navigation: 'local-state',
    });
    filterLogRef.current = { modelKey, count: filteredSessionCount };
  }, [filteredSessionCount, manualMaxBytes, manualMinBytes, searchText, sizePreset, sortDir, sortKey]);

  useEffect(() => {
    if (!selectedSessionPath) return;
    const stillVisible = filteredGroups.some((group) =>
      group.sessions.some((session) => session.path === selectedSessionPath),
    );
    if (!stillVisible) {
      const existsInMemory = sessionAssets.some((session) => session.path === selectedSessionPath);
      if (existsInMemory) {
        logDebug('viewer.explorer', 'Selected session hidden by filters', {
          selectedSessionPath,
          filterModel: buildFilterModel({
            searchText,
            sizePreset,
            manualMinBytes,
            manualMaxBytes,
            sortKey,
            sortDir,
          }),
        });
        onSelectionChange?.(null);
      }
    }
  }, [
    filteredGroups,
    manualMaxBytes,
    manualMinBytes,
    onSelectionChange,
    searchText,
    selectedSessionPath,
    sessionAssets,
    sizePreset,
    sortDir,
    sortKey,
  ]);

  useEffect(() => {
    const visibleIds = new Set(filteredGroups.map((group) => group.id));
    setExpandedGroupIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [filteredGroups]);

  useEffect(() => {
    if (sessionAssets.length > 0 && filteredSessionCount === 0) {
      const filterModel = buildFilterModel({
        searchText,
        sizePreset,
        manualMinBytes,
        manualMaxBytes,
        sortKey,
        sortDir,
      });
      logError('viewer.explorer', 'Filters produced zero sessions while memory still populated', {
        filterModel,
        totalSessions: sessionAssets.length,
        groupSamples: repositoryGroups.slice(0, 5).map((group) => group.id),
      });
    }
  }, [filteredSessionCount, manualMaxBytes, manualMinBytes, repositoryGroups, searchText, sessionAssets.length, sizePreset, sortDir, sortKey]);

  const toggleRepo = (group: RepositoryGroup) => {
    const isExpanded = expandedGroupIds.includes(group.id);
    const next = isExpanded
      ? expandedGroupIds.filter((id) => id !== group.id)
      : [...expandedGroupIds, group.id];
    setExpandedGroupIds(next);
    logDebug('viewer.explorer', 'Toggled repository group', {
      groupId: group.id,
      repoName: group.repoName,
      branchName: group.branchName,
      previousOpenState: isExpanded,
      nextOpenState: !isExpanded,
    });
    if (!isExpanded) {
      setLoadingRepoId(group.id);
      const simulatedDelay = group.sessions.length > 20 ? 400 : group.sessions.length > 8 ? 260 : 160;
      setTimeout(() => {
        setLoadingRepoId((current) => (current === group.id ? null : current));
      }, simulatedDelay);
    }
  };

  const resetFilters = () => {
    setSearchText('');
    setSizePreset('any');
    setManualMinValue('');
    setManualMaxValue('');
    setSortKey('timestamp');
    setSortDir('desc');
    setExpandedGroupIds([]);
    onSelectionChange?.(null);
  };

  const hasResults = filteredGroups.length > 0;
  const datasetEmpty = sessionAssets.length === 0;

  return (
    <section className="space-y-4 rounded-xl border border-border/80 bg-background/50 p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1 space-y-2">
          <p className="text-sm font-semibold">Session filters</p>
          <p className="text-xs text-muted-foreground">
            Showing {formatCount(filteredSessionCount)} of {formatCount(sessionAssets.length)} sessions
          </p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-2.5 size-4 text-muted-foreground" />
            <input
              type="search"
              aria-label="Search sessions"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search repo, branch, filename, or tag"
              className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <SlidersHorizontal className="size-4" />
                {SIZE_PRESETS[sizePreset].label}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Size presets</DropdownMenuLabel>
              {Object.values(SIZE_PRESETS).map((preset) => (
                <DropdownMenuCheckboxItem
                  key={preset.id}
                  checked={sizePreset === preset.id}
                  onCheckedChange={() => setSizePreset(preset.id)}
                >
                  {preset.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex flex-col gap-2 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Min</span>
              <input
                type="number"
                min={0}
                value={manualMinValue}
                onChange={(event) => setManualMinValue(event.target.value)}
                aria-label="Minimum size"
                className="h-7 w-16 rounded border border-border/60 bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <select
                value={manualMinUnit}
                onChange={(event) => setManualMinUnit(event.target.value as SizeUnit)}
                className="h-7 rounded border border-border/60 bg-background px-1 text-xs"
              >
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span>Max</span>
              <input
                type="number"
                min={0}
                value={manualMaxValue}
                onChange={(event) => setManualMaxValue(event.target.value)}
                aria-label="Maximum size"
                className="h-7 w-16 rounded border border-border/60 bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <select
                value={manualMaxUnit}
                onChange={(event) => setManualMaxUnit(event.target.value as SizeUnit)}
                className="h-7 rounded border border-border/60 bg-background px-1 text-xs"
              >
                <option value="KB">KB</option>
                <option value="MB">MB</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={sortKey === 'timestamp' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortKey('timestamp')}
            >
              Timestamp
            </Button>
            <Button
              type="button"
              variant={sortKey === 'size' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSortKey('size')}
            >
              Size
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="flex items-center gap-1"
            >
              <ArrowDownUp className="size-4" />
              {sortDir === 'asc' ? 'ASC' : 'DESC'}
            </Button>
          </div>
          <button
            type="button"
            className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline"
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-3" aria-live="polite">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Session repositories
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCount(filteredGroups.length)} grouped results
          </p>
        </div>
        {!hasResults ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
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
          filteredGroups.map((repo) => {
            const isExpanded = expandedGroupIds.includes(repo.id);
            const intentClass = getSessionChipIntent(repo.sessions.length);
            const sectionId = `repo-${repo.id}`;
            return (
              <article
                key={repo.id}
                className="rounded-2xl border border-border/80 bg-muted/5 p-4 transition hover:border-foreground/40"
              >
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  aria-controls={`${sectionId}-sessions`}
                  aria-label={`Toggle ${repo.label} repository`}
                  onClick={() => toggleRepo(repo)}
                  className={cn(
                    'flex w-full flex-col gap-3 rounded-xl border border-transparent px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between',
                    intentClass,
                    isExpanded && 'ring-2 ring-offset-1 ring-offset-background'
                  )}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant="outline"
                          className="cursor-default text-xs font-semibold uppercase tracking-wide"
                        >
                          {repo.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs font-semibold">{repo.label}</p>
                        <p className="text-xs opacity-80">Repo: {repo.repoName}</p>
                        <p className="text-xs opacity-80">Branch: {repo.branchName}</p>
                        {repo.commit ? (
                          <p className="text-xs opacity-80">Commit: {formatCommit(repo.commit)}</p>
                        ) : null}
                        <p className="text-xs opacity-80">Total size: {formatBytes(repo.totalSize)}</p>
                        <p className="text-xs opacity-80">Last updated: {formatDate(repo.lastUpdated)}</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-xs font-semibold">
                      {formatCount(repo.sessions.length)} {repo.sessions.length === 1 ? 'session' : 'sessions'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide">
                      {isExpanded ? 'Hide' : 'Expand'}
                    </span>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatBytes(repo.totalSize)}</p>
                    <p>Updated {formatRelativeTime(repo.lastUpdated, snapshotTimestamp)}</p>
                  </div>
                </button>

                {isExpanded ? (
                  <div className="mt-3" id={`${sectionId}-sessions`}>
                    {loadingRepoId === repo.id ? (
                      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                        <Loader className="size-4" aria-label="Loading sessions" />
                        Preparing session list…
                      </div>
                    ) : (
                      <SessionRepoVirtualList
                        sessions={repo.sessions}
                        snapshotTimestamp={snapshotTimestamp}
                        onSessionOpen={(session) => {
                          onSelectionChange?.(session.path);
                          return onSessionOpen?.(session);
                        }}
                        loadingSessionPath={loadingSessionPath}
                        selectedSessionPath={selectedSessionPath}
                      />
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function aggregateByRepository(sessionAssets: DiscoveredSessionAsset[]): RepositoryGroup[] {
  const map = new Map<string, RepositoryGroup>();
  for (const asset of sessionAssets) {
    const repoName = asset.repoMeta?.repo ?? asset.repoLabel ?? formatRepositoryLabel(asset.path);
    const branchName = asset.repoMeta?.branch ?? 'unknown';
    const commit = asset.repoMeta?.commit;
    const label = `${repoName ?? 'Session repo'} • ${branchName}`;
    const slug = slugify(`${repoName ?? 'session'}-${branchName}`);
    const existing = map.get(slug);
    if (existing) {
      existing.sessions.push(asset);
      existing.totalSize += asset.size ?? 0;
      existing.lastUpdated = Math.max(existing.lastUpdated ?? 0, asset.sortKey ?? 0) || existing.lastUpdated;
      if (!existing.repoMeta && asset.repoMeta) {
        existing.repoMeta = asset.repoMeta;
      }
    } else {
      map.set(slug, {
        id: slug,
        label,
        repoName: repoName ?? 'Unknown repo',
        branchName,
        commit,
        sessions: [asset],
        totalSize: asset.size ?? 0,
        lastUpdated: asset.sortKey,
        repoMeta: asset.repoMeta,
      });
    }
  }

  return Array.from(map.values());
}

function matchesSearchText(query: string, group: RepositoryGroup, session: DiscoveredSessionAsset) {
  const haystack = [
    group.repoName,
    group.branchName,
    group.commit,
    session.repoLabel,
    session.path,
    session.tags?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function sortSessions(sessions: DiscoveredSessionAsset[], sortKey: SortKey, sortDir: SortDirection) {
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

function buildFilterModel({
  searchText,
  sizePreset,
  manualMinBytes,
  manualMaxBytes,
  sortKey,
  sortDir,
}: {
  searchText: string;
  sizePreset: SizePresetId;
  manualMinBytes?: number;
  manualMaxBytes?: number;
  sortKey: SortKey;
  sortDir: SortDirection;
}) {
  return {
    textQuery: searchText.trim() || null,
    sizePreset,
    sizeMinBytes: manualMinBytes ?? SIZE_PRESETS[sizePreset].minBytes ?? null,
    sizeMaxBytes: manualMaxBytes ?? null,
    sortKey,
    sortOrder: sortDir,
    repoFilter: null,
    branchFilter: null,
  };
}

function formatRepositoryLabel(path: string) {
  const normalized = path.replace(/\\/g, '/');
  const segments = normalized.split('/');
  const sessionsIndex = segments.indexOf('sessions');
  const afterSessions = sessionsIndex >= 0 ? segments.slice(sessionsIndex + 1) : segments;
  const candidate = afterSessions[0] ?? segments[segments.length - 1] ?? 'Session';
  const trimmed = candidate.replace(/\.(jsonl|ndjson|json)$/i, '');
  const words = trimmed
    .replace(/[-_]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3);
  const label = words.join(' ');
  return label ? capitalizeWords(label) : 'Session Repo';
}

function capitalizeWords(value: string) {
  return value.replace(/\b([a-z])/gi, (match) => match.toUpperCase());
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
}: {
  sessions: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
}) {
  const items = useMemo<SessionTimelineItem[]>(
    () => sessions.map((session, index) => ({ session, index })),
    [sessions],
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
}: {
  session: DiscoveredSessionAsset;
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  isLoading?: boolean;
  isSelected?: boolean;
}) {
  const displayName = formatSessionTitle(session.path);
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
            {session.repoLabel ? (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300">
                {session.repoLabel}
              </p>
            ) : null}
            {session.repoMeta?.repo ? (
              <p className="truncate text-[11px] text-muted-foreground">{session.repoMeta.repo}</p>
            ) : null}
            {session.repoMeta?.branch || session.repoMeta?.commit ? (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {session.repoMeta?.branch ? `Branch ${session.repoMeta.branch}` : null}
                {session.repoMeta?.branch && session.repoMeta?.commit ? ' · ' : ''}
                {session.repoMeta?.commit ? `Commit ${formatCommit(session.repoMeta.commit)}` : null}
              </p>
            ) : null}
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{session.path}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <p>{formatBytes(session.size)}</p>
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
            <span key={`${session.path}-${tag}`} className="rounded-full border border-border/70 px-2 py-0.5">
              {tag}
            </span>
          ))}
          {session.tags && session.tags.length > 3 ? <span>+{session.tags.length - 3}</span> : null}
          <div className="ml-auto flex items-center gap-2">
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

function formatSessionTitle(path: string) {
  const segments = path.replace(/\\/g, '/').split('/');
  const filename = segments.pop() ?? path;
  return filename || path;
}

function formatCommit(commit: string) {
  return commit.length > 8 ? commit.slice(0, 8) : commit;
}
