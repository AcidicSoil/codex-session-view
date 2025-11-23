import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Filter as FilterIcon } from 'lucide-react';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Loader } from '~/components/ui/loader';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import type { RepoMetadata } from '~/lib/repo-metadata';
import { cn } from '~/lib/utils';
import { formatCount, formatDateTime } from '~/utils/intl';
import { BorderBeam } from '~/components/ui/border-beam';
import { TimelineView } from '~/components/viewer/TimelineView';

type FilterGroup = 'size' | 'date';

interface FilterChipConfig {
  id: string;
  label: string;
  description: string;
  group: FilterGroup;
  predicate: (asset: DiscoveredSessionAsset, now: number) => boolean;
}

interface RepositoryGroup {
  id: string;
  label: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
  repoMeta?: RepoMetadata;
}

export interface SessionListProps {
  sessionAssets: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  selectedFilterIds?: string[];
  onSelectedFilterIdsChange?: (next: string[]) => void;
  expandedRepoIds?: string[];
  onExpandedRepoIdsChange?: (next: string[]) => void;
  minSizeMb?: number;
  onMinSizeMbChange?: (value?: number) => void;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
}

const dateFilters: FilterChipConfig[] = [
  {
    id: 'date-7',
    label: 'Last 7 days',
    description: 'Newest sessions from this week',
    group: 'date',
    predicate: (asset, now) => (asset.sortKey ?? 0) >= now - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'date-30',
    label: 'Last 30 days',
    description: 'Sessions updated in the past month',
    group: 'date',
    predicate: (asset, now) => (asset.sortKey ?? 0) >= now - 30 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'date-90',
    label: 'Last 90 days',
    description: 'Quarterly view of recent work',
    group: 'date',
    predicate: (asset, now) => (asset.sortKey ?? 0) >= now - 90 * 24 * 60 * 60 * 1000,
  },
];

const allFilterChips = dateFilters;
export const sessionFilterChipIds = allFilterChips.map((chip) => chip.id);

const sessionCountIntensity = {
  low: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  medium: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-50',
  high: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50',
} as const;

function uniqueStrings(values: string[], allowList?: Set<string>) {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (allowList && !allowList.has(value)) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    cleaned.push(value);
  }
  return cleaned;
}

const filterChipIdSet = new Set(sessionFilterChipIds);

export function sanitizeSessionFilterIds(ids: string[]) {
  return uniqueStrings(ids, filterChipIdSet);
}

function dedupeRepoIds(ids: string[]) {
  return uniqueStrings(ids);
}

export function SessionList({
  sessionAssets,
  snapshotTimestamp,
  selectedFilterIds: selectedFilterIdsProp,
  onSelectedFilterIdsChange,
  expandedRepoIds: expandedRepoIdsProp,
  onExpandedRepoIdsChange,
  minSizeMb: minSizeMbProp,
  onMinSizeMbChange,
  onSessionOpen,
  loadingSessionPath,
}: SessionListProps) {
  const isFiltersControlled = Array.isArray(selectedFilterIdsProp);
  const isExpandedControlled = Array.isArray(expandedRepoIdsProp);
  const isMinSizeControlled = typeof minSizeMbProp === 'number';

  const [localFilterIds, setLocalFilterIds] = useState<string[]>(() =>
    sanitizeSessionFilterIds(selectedFilterIdsProp ?? [])
  );
  const [localExpandedRepoIds, setLocalExpandedRepoIds] = useState<string[]>(() =>
    dedupeRepoIds(expandedRepoIdsProp ?? [])
  );
  const [localMinSizeMb, setLocalMinSizeMb] = useState<number | undefined>(minSizeMbProp);
  const [sizeInputValue, setSizeInputValue] = useState<string>(() =>
    minSizeMbProp !== undefined ? String(minSizeMbProp) : ''
  );
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);

  useEffect(() => {
    if (isMinSizeControlled) {
      setLocalMinSizeMb(minSizeMbProp);
      setSizeInputValue(minSizeMbProp !== undefined ? String(minSizeMbProp) : '');
    } else if (minSizeMbProp === undefined) {
      setLocalMinSizeMb(undefined);
      setSizeInputValue('');
    }
  }, [isMinSizeControlled, minSizeMbProp]);

  const resolvedFilterIds = sanitizeSessionFilterIds(
    isFiltersControlled ? selectedFilterIdsProp ?? [] : localFilterIds
  );
  const resolvedExpandedRepoIds = dedupeRepoIds(
    isExpandedControlled ? expandedRepoIdsProp ?? [] : localExpandedRepoIds
  );
  const resolvedMinSizeMb = isMinSizeControlled ? minSizeMbProp ?? undefined : localMinSizeMb;
  const resolvedMinSizeBytes = resolvedMinSizeMb !== undefined ? resolvedMinSizeMb * 1024 * 1024 : undefined;

  const updateFilterIds = (next: string[]) => {
    if (!isFiltersControlled) {
      setLocalFilterIds(next);
    }
    onSelectedFilterIdsChange?.(next);
  };

  const updateExpandedRepoIds = (next: string[]) => {
    if (!isExpandedControlled) {
      setLocalExpandedRepoIds(next);
    }
    onExpandedRepoIdsChange?.(next);
  };

  const updateMinSizeMb = (next: number | undefined) => {
    if (!isMinSizeControlled) {
      setLocalMinSizeMb(next);
    }
    onMinSizeMbChange?.(next);
  };

  const handleMinSizeInput = (value: string) => {
    setSizeInputValue(value);
    if (!value.trim()) {
      updateMinSizeMb(undefined);
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    updateMinSizeMb(parsed);
  };

  const activeFilters = useMemo(
    () => allFilterChips.filter((chip) => resolvedFilterIds.includes(chip.id)),
    [resolvedFilterIds]
  );
  const activeFilterBadges = [
    ...activeFilters.map((chip) => chip.label),
    resolvedMinSizeMb !== undefined ? `≥ ${resolvedMinSizeMb} MB` : null,
  ].filter(Boolean) as string[];
  const activeFilterCount = activeFilterBadges.length;

  const filteredSessions = useMemo(() => {
    if (!activeFilters.length && resolvedMinSizeBytes === undefined) return sessionAssets;
    const now = Date.now();
    return sessionAssets.filter((asset) => {
      const matchesFilters = activeFilters.every((filter) => filter.predicate(asset, now));
      const matchesSize = resolvedMinSizeBytes === undefined ? true : (asset.size ?? 0) >= resolvedMinSizeBytes;
      return matchesFilters && matchesSize;
    });
  }, [sessionAssets, activeFilters, resolvedMinSizeBytes]);

  const repositoryGroups = useMemo(() => aggregateByRepository(filteredSessions), [filteredSessions]);

  const sortedGroups = useMemo(() => sortRepositories(repositoryGroups, activeFilters), [repositoryGroups, activeFilters]);

  const handleChipToggle = (filterId: string) => {
    const next = resolvedFilterIds.includes(filterId)
      ? resolvedFilterIds.filter((id) => id !== filterId)
      : [...resolvedFilterIds, filterId];
    updateFilterIds(sanitizeSessionFilterIds(next));
  };

  const clearFilters = () => {
    updateFilterIds([]);
    handleMinSizeInput('');
  };

  const toggleRepo = (repoId: string, sessionCount: number) => {
    const isExpanded = resolvedExpandedRepoIds.includes(repoId);
    const next = isExpanded
      ? resolvedExpandedRepoIds.filter((id) => id !== repoId)
      : [...resolvedExpandedRepoIds, repoId];
    const deduped = dedupeRepoIds(next);
    updateExpandedRepoIds(deduped);

    if (!isExpanded) {
      setLoadingRepoId(repoId);
      const simulatedDelay = sessionCount > 20 ? 400 : sessionCount > 8 ? 260 : 160;
      setTimeout(() => {
        setLoadingRepoId((current) => (current === repoId ? null : current));
      }, simulatedDelay);
    }
  };

  const hasResults = sortedGroups.length > 0;
  const datasetEmpty = sessionAssets.length === 0;

  return (
    <section className="space-y-4 rounded-xl border border-border/80 bg-background/50 p-4 shadow-sm">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold">Session filters</p>
          <p className="text-xs text-muted-foreground">
            Showing {formatCount(filteredSessions.length)} of {formatCount(sessionAssets.length)} sessions
            {resolvedMinSizeMb !== undefined ? ` (min ${resolvedMinSizeMb} MB).` : '.'}
          </p>
          {activeFilterBadges.length ? (
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
              {activeFilterBadges.map((label) => (
                <span key={label} className="rounded-full border border-border/70 px-2 py-0.5">
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <FilterIcon className="size-4" />
                Filters
                {activeFilterCount ? (
                  <span className="text-xs text-muted-foreground">({activeFilterCount})</span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-80 space-y-3">
              <DropdownMenuLabel>Minimum size</DropdownMenuLabel>
              <div className="flex items-center gap-2 px-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.1"
                  className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="e.g. 2"
                  value={sizeInputValue}
                  onChange={(event) => handleMinSizeInput(event.target.value)}
                />
                <span className="text-xs text-muted-foreground">MB</span>
                {resolvedMinSizeMb !== undefined ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleMinSizeInput('')}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Date filters</DropdownMenuLabel>
              {dateFilters.map((chip) => (
                <DropdownMenuCheckboxItem
                  key={chip.id}
                  checked={resolvedFilterIds.includes(chip.id)}
                  onCheckedChange={() => handleChipToggle(chip.id)}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{chip.label}</span>
                    <span className="text-xs text-muted-foreground">{chip.description}</span>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className={cn(
              'text-xs font-medium underline-offset-4 transition hover:underline',
              activeFilterCount === 0 ? 'text-muted-foreground' : 'text-foreground'
            )}
            onClick={clearFilters}
            disabled={activeFilterCount === 0}
          >
            Reset filters
          </button>
        </div>
      </div>

      <div className="space-y-3" aria-live="polite">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Session repositories
          </p>
          <p className="text-xs text-muted-foreground">
            {formatCount(sortedGroups.length)} grouped results
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
          sortedGroups.map((repo) => {
            const isExpanded = resolvedExpandedRepoIds.includes(repo.id);
            const intentClass = getSessionChipIntent(repo.sessions.length);
            const sessionLabel = repo.sessions.length === 1 ? 'session' : 'sessions';
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
                  onClick={() => toggleRepo(repo.id, repo.sessions.length)}
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
                        {repo.repoMeta?.repo ? (
                          <p className="text-xs opacity-80">Repo: {repo.repoMeta.repo}</p>
                        ) : null}
                        {repo.repoMeta?.branch ? (
                          <p className="text-xs opacity-80">Branch: {repo.repoMeta.branch}</p>
                        ) : null}
                        {repo.repoMeta?.commit ? (
                          <p className="text-xs opacity-80">Commit: {formatCommit(repo.repoMeta.commit)}</p>
                        ) : null}
                        <p className="text-xs opacity-80">Total size: {formatBytes(repo.totalSize)}</p>
                        <p className="text-xs opacity-80">Last updated: {formatDate(repo.lastUpdated)}</p>
                      </TooltipContent>
                    </Tooltip>
                    <span className="text-xs font-semibold">
                      {formatCount(repo.sessions.length)} {sessionLabel}
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
                        onSessionOpen={onSessionOpen}
                        loadingSessionPath={loadingSessionPath}
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
    const canonical = asset.repoMeta?.repo ?? asset.repoLabel ?? formatRepositoryLabel(asset.path);
    const label = asset.repoLabel ?? canonical;
    const id = slugify(canonical ?? label);
    const current = map.get(id);
    if (current) {
      current.sessions.push(asset);
      current.totalSize += asset.size ?? 0;
      current.lastUpdated = Math.max(current.lastUpdated ?? 0, asset.sortKey ?? 0) || current.lastUpdated;
      if (!current.repoMeta && asset.repoMeta) {
        current.repoMeta = asset.repoMeta;
      }
    } else {
      map.set(id, {
        id,
        label,
        sessions: [asset],
        totalSize: asset.size ?? 0,
        lastUpdated: asset.sortKey,
        repoMeta: asset.repoMeta,
      });
    }
  }

  return Array.from(map.values()).map((repo) => ({
    ...repo,
    sessions: [...repo.sessions].sort((a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0) || a.path.localeCompare(b.path)),
  }));
}

function sortRepositories(groups: RepositoryGroup[], activeFilters: FilterChipConfig[]) {
  const hasSizeFilter = activeFilters.some((filter) => filter.group === 'size');
  const hasDateFilter = activeFilters.some((filter) => filter.group === 'date');

  return [...groups].sort((a, b) => {
    if (hasSizeFilter) {
      const diff = b.totalSize - a.totalSize;
      if (diff !== 0) return diff;
    }

    if (hasDateFilter) {
      const diff = (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0);
      if (diff !== 0) return diff;
    }

    const countDiff = b.sessions.length - a.sessions.length;
    if (countDiff !== 0) return countDiff;

    return a.label.localeCompare(b.label);
  });
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
}: {
  sessions: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
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
}: {
  session: DiscoveredSessionAsset;
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  isLoading?: boolean;
}) {
  const displayName = formatSessionTitle(session.path);
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background via-background/60 to-muted/40 p-4">
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
