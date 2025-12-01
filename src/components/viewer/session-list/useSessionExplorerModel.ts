import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { buildSearchMatchers } from '~/utils/search';
import {
  type ActiveFilterBadge,
  type BranchGroup,
  type FilterBadgeKey,
  type QuickFilterOption,
  type RepositoryGroup,
  type SessionExplorerFilterState,
  type SessionPreset,
  defaultFilterState,
} from './sessionExplorerTypes';
import {
  aggregateByRepository,
  buildActiveFilterBadges,
  buildFilterModel,
  getSortValue,
  matchesSearchText,
  sortSessions,
  toBytes,
  toLocalDateTimeInput,
  toTimestampMs,
} from './sessionExplorerUtils';

interface UseSessionExplorerModelOptions {
  sessionAssets: DiscoveredSessionAsset[];
  snapshotTimestamp: number;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
}

export function useSessionExplorerModel({
  sessionAssets,
  snapshotTimestamp,
  selectedSessionPath,
  onSelectionChange,
}: UseSessionExplorerModelOptions) {
  const [filters, setFilters] = useState<SessionExplorerFilterState>(() => ({
    ...defaultFilterState,
  }));
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const [sessionPreset, setSessionPreset] = useState<SessionPreset>('all');
  const [isQuickFilterOpen, setIsQuickFilterOpen] = useState(false);
  const searchMatchers = useMemo(
    () => buildSearchMatchers(filters.searchText),
    [filters.searchText]
  );

  const sizeMinBytes = toBytes(filters.sizeMinValue, filters.sizeMinUnit);
  const sizeMaxBytes = toBytes(filters.sizeMaxValue, filters.sizeMaxUnit);
  const timestampFromMs = toTimestampMs(filters.timestampFrom);
  const timestampToMs = toTimestampMs(filters.timestampTo);

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

  const quickFilterOptions = useMemo<QuickFilterOption[]>(
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

  useEffect(() => {
    if (sizeMinBytes !== undefined && sizeMaxBytes !== undefined && sizeMinBytes > sizeMaxBytes) {
      logWarn('viewer.filters', 'Manual size range invalid', { sizeMinBytes, sizeMaxBytes });
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
    () => sessionAssets.filter((asset) => typeof asset.url === 'string' && asset.url.includes('/api/uploads/')),
    [sessionAssets]
  );

  const repositoryGroups = useMemo(
    () => aggregateByRepository(accessibleAssets),
    [accessibleAssets]
  );

  const viewModelLogRef = useRef<{ total: number; groups: number } | null>(null);
  useEffect(() => {
    const repoCount = new Set(repositoryGroups.map((group) => group.repoName)).size;
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
            const sortedSessions = sortSessions(filteredSessions, filters.sortKey, filters.sortDir);
            const primarySortValue = getSortValue(sortedSessions[0], filters.sortKey) ?? 0;
            return {
              ...branch,
              sessions: sortedSessions,
              primarySortValue,
            };
          })
          .filter(Boolean) as Array<BranchGroup & { primarySortValue: number }>;

        const branchDirection = filters.sortDir === 'asc' ? 1 : -1;
        const sortedBranches = filteredBranches.sort((a, b) => {
          const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0);
          if (diff !== 0) return branchDirection * diff;
          return a.name.localeCompare(b.name);
        });

        if (!sortedBranches.length) return null;
        const flattenedSessions = sortedBranches.flatMap((branch) => branch.sessions);
        const primarySortValue = sortedBranches[0]?.primarySortValue ?? 0;
        const filteredNamedBranches = sortedBranches.filter(
          (branch) =>
            branch.name && branch.name.trim().length > 0 && branch.name.toLowerCase() !== 'unknown'
        );
        const branchCount = filteredNamedBranches.length;
        const hasUnknownBranch = sortedBranches.some((branch) => branch.name.toLowerCase() === 'unknown');
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
      const direction = filters.sortDir === 'asc' ? 1 : -1;
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
    filters.sortKey,
    filters.sortDir,
    timestampFromMs,
    timestampToMs,
  ]);

  const filterLogRef = useRef<{ modelKey: string; count: number }>({
    modelKey: '',
    count: sessionAssets.length,
  });
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
      const existsInMemory = accessibleAssets.some((session) => session.path === selectedSessionPath);
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
    accessibleAssets,
    filters,
    selectedSessionPath,
    onSelectionChange,
    sizeMaxBytes,
    sizeMinBytes,
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

  const handleRepoToggle = useCallback((group: RepositoryGroup, shouldExpand: boolean) => {
    logDebug('viewer.explorer', 'Toggled repository group', {
      groupId: group.id,
      repoName: group.repoName,
      branchCount: group.branchCount,
      previousOpenState: !shouldExpand,
      nextOpenState: shouldExpand,
    });
    if (shouldExpand) {
      setLoadingRepoId(group.id);
      const simulatedDelay = group.sessions.length > 20 ? 400 : group.sessions.length > 8 ? 260 : 160;
      setTimeout(() => {
        setLoadingRepoId((current) => (current === group.id ? null : current));
      }, simulatedDelay);
    } else {
      setLoadingRepoId((current) => (current === group.id ? null : current));
    }
  }, []);

  const handleAccordionChange = useCallback(
    (nextValue: string[]) => {
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
    },
    [expandedGroupIds, filteredGroups, handleRepoToggle]
  );

  const resetFilters = useCallback(() => {
    setFilters({ ...defaultFilterState });
    setExpandedGroupIds([]);
    setSessionPreset('all');
    onSelectionChange?.(null);
  }, [onSelectionChange]);

  const activeBadges = useMemo<ActiveFilterBadge[]>(() => buildActiveFilterBadges(filters), [filters]);
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

  return {
    filters,
    sessionPreset,
    applyPreset,
    updateFilter,
    quickFilterOptions,
    isQuickFilterOpen,
    setIsQuickFilterOpen,
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
  };
}

function defaultState() {
  return {
    searchText: '',
    sortKey: 'timestamp' as const,
    sortDir: 'desc' as const,
    sizeMinValue: '',
    sizeMinUnit: 'MB' as const,
    sizeMaxValue: '',
    sizeMaxUnit: 'MB' as const,
    timestampFrom: '',
    timestampTo: '',
  } satisfies SessionExplorerFilterState;
}
