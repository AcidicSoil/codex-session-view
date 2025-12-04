import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { formatDateTime } from '~/utils/intl'
import type { SearchMatcher } from '~/utils/search'
import { matchesSearchMatchers } from '~/utils/search'
import {
  type ActiveFilterBadge,
  type BranchGroup,
  type FilterBadgeKey,
  type RepositoryGroup,
  type SessionExplorerFilterDimensions,
  type SessionExplorerFilterOption,
  type SessionExplorerFilterState,
  type SessionRecencyPreset,
  type SizeUnit,
  type SortDirection,
  type SortKey,
} from './sessionExplorerTypes'

const sessionCountIntensity = {
  low: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  medium: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-50',
  high: 'bg-sky-100 text-sky-900 dark:bg-sky-500/20 dark:text-sky-50',
} as const;

export function aggregateByRepository(sessionAssets: DiscoveredSessionAsset[]): RepositoryGroup[] {
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
          branchCount: 0,
          hasUnknownBranch: false,
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
    branch.lastUpdated = Math.max(branch.lastUpdated ?? 0, asset.sortKey ?? 0) || branch.lastUpdated;
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
    const hasUnknownBranch = sortedBranches.some((branch) => branch.name.toLowerCase() === 'unknown');
    return {
      ...group,
      branches: sortedBranches,
      branchCount,
      hasUnknownBranch,
    };
  });
}

export function matchesSearchText(
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

export function describeBranches(branches: BranchGroup[]) {
  if (!branches.length) return 'Unknown';
  const names = branches.map((branch) => branch.name);
  if (names.length <= 3) {
    return names.join(', ');
  }
  const preview = names.slice(0, 3).join(', ');
  return `${preview} +${names.length - 3}`;
}

export function sortSessions(
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

export function getSortValue(session: DiscoveredSessionAsset, sortKey: SortKey) {
  if (sortKey === 'size') {
    return session.size ?? 0;
  }
  return session.sortKey ?? 0;
}

export function toBytes(value: string, unit: SizeUnit) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  const multiplier = unit === 'KB' ? 1024 : 1024 * 1024;
  return parsed * multiplier;
}

export function toTimestampMs(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function toLocalDateTimeInput(ms: number) {
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms);
  const offsetMinutes = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function buildFilterModel(
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
    branchFilter: state.branchFilters,
    sourceFilter: state.sourceFilters,
    tagFilter: state.tagFilters,
    recency: state.recency,
  };
}

export function buildActiveFilterBadges(state: SessionExplorerFilterState): ActiveFilterBadge[] {
  const badges: ActiveFilterBadge[] = [];
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

export function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'session-repo';
}

export function getSessionChipIntent(count: number) {
  if (count <= 2) return sessionCountIntensity.low;
  if (count <= 5) return sessionCountIntensity.medium;
  return sessionCountIntensity.high;
}

export function formatBytes(value?: number) {
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

export function formatDate(value?: number) {
  if (!value) return 'Unknown date';
  return formatDateTime(value);
}

export function formatRelativeTime(value: number | undefined, referenceMs: number) {
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

export function formatCommit(commit: string) {
  return commit.length > 8 ? commit.slice(0, 8) : commit;
}

export function extractSessionId(label?: string | null) {
  if (!label) return null;
  const match = label.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  return match ? match[0] : null;
}

export function cleanRepoName(name?: string | null) {
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

export function getFilterBadgeByKey(
  badges: ActiveFilterBadge[],
  key: FilterBadgeKey
): ActiveFilterBadge | undefined {
  return badges.find((badge) => badge.key === key);
}

export function buildFilterDimensions(assets: DiscoveredSessionAsset[]): SessionExplorerFilterDimensions {
  const sourceMap = new Map<string, SessionExplorerFilterOption>()
  const branchMap = new Map<string, SessionExplorerFilterOption>()
  const tagMap = new Map<string, SessionExplorerFilterOption>()

  const increment = (
    target: Map<string, SessionExplorerFilterOption>,
    id: string,
    label: string,
  ) => {
    const entry = target.get(id)
    if (entry) {
      entry.count += 1
      return
    }
    target.set(id, { id, label, count: 1 })
  }

  for (const asset of assets) {
    increment(sourceMap, asset.source, labelSource(asset.source))
    const branchId = (asset.branch || 'Unknown').toLowerCase()
    increment(branchMap, branchId, asset.branch || 'Unknown branch')
    asset.tags?.forEach((tag) => {
      const normalized = tag.trim()
      if (!normalized) return
      increment(tagMap, normalized.toLowerCase(), normalized)
    })
  }

  const toSortedArray = (target: Map<string, SessionExplorerFilterOption>) =>
    Array.from(target.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  return {
    sources: toSortedArray(sourceMap),
    branches: toSortedArray(branchMap),
    tags: toSortedArray(tagMap),
  }
}

function labelSource(source: string) {
  switch (source) {
    case 'bundled':
      return 'Bundled'
    case 'external':
      return 'External'
    case 'upload':
      return 'Upload'
    default:
      return source
  }
}

export const RECENCY_PRESETS: Array<{
  id: SessionRecencyPreset
  label: string
  description: string
  windowMs?: number
}> = [
  { id: 'all', label: 'Any time', description: 'No recency filter applied' },
  { id: '24h', label: '24 hours', description: 'Updated within the last day', windowMs: 1000 * 60 * 60 * 24 },
  { id: '7d', label: '7 days', description: 'Updated within the last week', windowMs: 1000 * 60 * 60 * 24 * 7 },
  { id: '30d', label: '30 days', description: 'Updated within the last month', windowMs: 1000 * 60 * 60 * 24 * 30 },
]

export function getRecencyWindowMs(preset: SessionRecencyPreset) {
  const found = RECENCY_PRESETS.find((option) => option.id === preset)
  return found?.windowMs
}
