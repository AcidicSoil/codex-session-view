import { useMemo, useState } from 'react';
import { Badge } from '~/components/ui/badge';
import { Loader } from '~/components/ui/loader';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { cn } from '~/lib/utils';
import { formatCount, formatDateTime } from '~/utils/intl';

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
}

export interface SessionListProps {
  sessionAssets: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  selectedFilterIds?: string[];
  onSelectedFilterIdsChange?: (next: string[]) => void;
  expandedRepoIds?: string[];
  onExpandedRepoIdsChange?: (next: string[]) => void;
}

const sizeFilters: FilterChipConfig[] = [
  {
    id: 'size-100kb',
    label: 'Size > 100 KB',
    description: 'Only show sessions larger than 100 kilobytes',
    group: 'size',
    predicate: (asset) => (asset.size ?? 0) > 100 * 1024,
  },
  {
    id: 'size-1mb',
    label: 'Size > 1 MB',
    description: 'Restrict to larger transcripts for deeper dives',
    group: 'size',
    predicate: (asset) => (asset.size ?? 0) > 1_000_000,
  },
  {
    id: 'size-5mb',
    label: 'Size > 5 MB',
    description: 'Surface only heavyweight session captures',
    group: 'size',
    predicate: (asset) => (asset.size ?? 0) > 5_000_000,
  },
];

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

const filterGroups = [
  { title: 'Size', chips: sizeFilters },
  { title: 'Date', chips: dateFilters },
];

const allFilterChips = filterGroups.flatMap((group) => group.chips);
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
}: SessionListProps) {
  const isFiltersControlled = Array.isArray(selectedFilterIdsProp);
  const isExpandedControlled = Array.isArray(expandedRepoIdsProp);

  const [localFilterIds, setLocalFilterIds] = useState<string[]>(() =>
    sanitizeSessionFilterIds(selectedFilterIdsProp ?? [])
  );
  const [localExpandedRepoIds, setLocalExpandedRepoIds] = useState<string[]>(() =>
    dedupeRepoIds(expandedRepoIdsProp ?? [])
  );
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);

  const resolvedFilterIds = sanitizeSessionFilterIds(
    isFiltersControlled ? selectedFilterIdsProp ?? [] : localFilterIds
  );
  const resolvedExpandedRepoIds = dedupeRepoIds(
    isExpandedControlled ? expandedRepoIdsProp ?? [] : localExpandedRepoIds
  );

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

  const activeFilters = useMemo(
    () => allFilterChips.filter((chip) => resolvedFilterIds.includes(chip.id)),
    [resolvedFilterIds]
  );

  const filteredSessions = useMemo(() => {
    if (!activeFilters.length) return sessionAssets;
    const now = Date.now();
    return sessionAssets.filter((asset) => activeFilters.every((filter) => filter.predicate(asset, now)));
  }, [sessionAssets, activeFilters]);

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
          <p className="text-sm font-semibold">Repository filters</p>
          <p className="text-xs text-muted-foreground">
            Toggle chips to refine by size or recency. {formatCount(filteredSessions.length)} of{' '}
            {formatCount(sessionAssets.length)} sessions shown.
          </p>
        </div>
        <button
          type="button"
          className={cn(
            'text-xs font-medium underline-offset-4 transition hover:underline',
            resolvedFilterIds.length === 0 ? 'text-muted-foreground' : 'text-foreground'
          )}
          onClick={clearFilters}
          disabled={resolvedFilterIds.length === 0}
        >
          Clear all filters
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {filterGroups.map((group) => (
          <div key={group.title} className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {group.title} filters
            </p>
            <div className="flex flex-wrap gap-2">
              {group.chips.map((chip) => {
                const isActive = resolvedFilterIds.includes(chip.id);
                return (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`${chip.label}. ${chip.description}`}
                    onClick={() => handleChipToggle(chip.id)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border/70 text-foreground hover:bg-muted/60'
                    )}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
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
                      <ul className="divide-y divide-border rounded-xl border border-border/80 bg-background/70">
                        {repo.sessions.map((session) => (
                          <li key={session.path} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <p className="truncate text-sm font-medium">{session.path}</p>
                              <a
                                className="truncate text-xs text-primary underline-offset-2 hover:underline"
                                href={session.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {session.url}
                              </a>
                              {session.tags && session.tags.length > 0 ? (
                                <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                                  {session.tags.map((tag) => (
                                    <span
                                      key={`${session.path}-${tag}`}
                                      className="rounded-full border border-border/70 px-2 py-0.5"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              <p>{formatBytes(session.size)}</p>
                              <p>{formatDate(session.sortKey)}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
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
    const label = formatRepositoryLabel(asset.path);
    const id = slugify(label);
    const current = map.get(id);
    if (current) {
      current.sessions.push(asset);
      current.totalSize += asset.size ?? 0;
      current.lastUpdated = Math.max(current.lastUpdated ?? 0, asset.sortKey ?? 0) || current.lastUpdated;
    } else {
      map.set(id, {
        id,
        label,
        sessions: [asset],
        totalSize: asset.size ?? 0,
        lastUpdated: asset.sortKey,
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
