import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { buildSearchMatchers } from '~/utils/search';
import type { MultiSelectorGroup, MultiSelectorOption, MultiSelectorValue } from '~/components/ui/multi-selector';
import {
  type ActiveFilterBadge,
  type BranchGroup,
  type FilterBadgeKey,
  type RepositoryGroup,
  type SessionExplorerFilterState,
  type SessionPreset,
  type SessionRecencyPreset,
  defaultFilterState,
} from './sessionExplorerTypes';
import {
  aggregateByRepository,
  buildActiveFilterBadges,
  buildFilterDimensions,
  buildFilterModel,
  getRecencyWindowMs,
  getSortValue,
  matchesSearchText,
  RECENCY_PRESETS,
  sortSessions,
  toBytes,
  toLocalDateTimeInput,
  toTimestampMs,
} from './sessionExplorerUtils'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'

function cloneFilters(input: SessionExplorerFilterState): SessionExplorerFilterState {
  return {
    ...input,
    sourceFilters: [...input.sourceFilters],
    branchFilters: [...input.branchFilters],
    tagFilters: [...input.tagFilters],
  }
}

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
  const sessionExplorerState = useUiSettingsStore((state) => state.sessionExplorer)
  const updateSessionExplorer = useUiSettingsStore((state) => state.updateSessionExplorer)
  const [filters, setFilters] = useState<SessionExplorerFilterState>(() => cloneFilters(sessionExplorerState.filters));
  const normalizedBranchFilters = useMemo(
    () => filters.branchFilters.map((branch) => branch.toLowerCase()),
    [filters.branchFilters],
  )
  const normalizedTagFilters = useMemo(
    () => filters.tagFilters.map((tag) => tag.toLowerCase()),
    [filters.tagFilters],
  )
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const [sessionPreset, setSessionPreset] = useState<SessionPreset>(sessionExplorerState.sessionPreset);
  const searchMatchers = useMemo(
    () => buildSearchMatchers(filters.searchText),
    [filters.searchText]
  );

  const sizeMinBytes = toBytes(filters.sizeMinValue, filters.sizeMinUnit)
  const sizeMaxBytes = toBytes(filters.sizeMaxValue, filters.sizeMaxUnit)
  const manualTimestampFromMs = toTimestampMs(filters.timestampFrom)
  const timestampToMs = toTimestampMs(filters.timestampTo)
  const recencyWindowMs = getRecencyWindowMs(filters.recency)
  const recencyFromMs = typeof recencyWindowMs === 'number' ? snapshotTimestamp - recencyWindowMs : undefined
  const timestampFromMs = resolveTimestampFrom(manualTimestampFromMs, recencyFromMs)

  useEffect(() => {
    setFilters((prev) => {
      if (prev === sessionExplorerState.filters) return prev
      return cloneFilters(sessionExplorerState.filters)
    })
  }, [sessionExplorerState.filters])

  useEffect(() => {
    setSessionPreset(sessionExplorerState.sessionPreset)
  }, [sessionExplorerState.sessionPreset])

  const persistFilters = useCallback(
    (updater: (prev: SessionExplorerFilterState) => SessionExplorerFilterState) => {
      setFilters((prev) => {
        const next = updater(prev)
        updateSessionExplorer((state) => ({ ...state, filters: next }))
        return next
      })
    },
    [updateSessionExplorer],
  )

  const updateFilter = useCallback(
    <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => {
      persistFilters((prev) => ({ ...prev, [key]: value }))
    },
    [persistFilters],
  )

  const commitSessionPreset = useCallback(
    (next: SessionPreset) => {
      setSessionPreset(next)
      updateSessionExplorer((state) => ({ ...state, sessionPreset: next }))
    },
    [updateSessionExplorer],
  )

  const applyPreset = useCallback(
    (value: SessionPreset) => {
      commitSessionPreset(value);
      if (value === 'all') {
        persistFilters((prev) => ({
          ...prev,
          timestampFrom: '',
          timestampTo: '',
          sizeMinValue: '',
          sizeMaxValue: '',
        }))
        return;
      }
      if (value === 'recent') {
        const fromIso = toLocalDateTimeInput(snapshotTimestamp - 1000 * 60 * 60 * 24 * 2);
        persistFilters((prev) => ({
          ...prev,
          timestampFrom: fromIso,
          timestampTo: '',
        }))
        return;
      }
      if (value === 'heavy') {
        persistFilters((prev) => ({
          ...prev,
          sizeMinValue: '25',
          sizeMinUnit: 'MB',
          sizeMaxValue: '',
        }))
        return
      }
    },
    [commitSessionPreset, persistFilters, snapshotTimestamp]
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

  const filterDimensions = useMemo(() => buildFilterDimensions(accessibleAssets), [accessibleAssets])

  const multiSelectorGroups = useMemo<MultiSelectorGroup[]>(
    () => [
      {
        id: 'sourceFilters',
        label: 'Sources',
        description: 'Bundled, external, or upload sessions',
        allowMultiple: true,
      },
      {
        id: 'branchFilters',
        label: 'Branches',
        description: 'Highlight specific repo branches',
        allowMultiple: true,
      },
      {
        id: 'tagFilters',
        label: 'Tags',
        description: 'Filter by session tags',
        allowMultiple: true,
      },
      {
        id: 'recency',
        label: 'Recency',
        description: 'Time window',
        allowMultiple: false,
      },
    ],
    [],
  )

  const multiSelectorOptions = useMemo<MultiSelectorOption[]>(() => {
    const formatCountLabel = (count: number) => `${count} session${count === 1 ? '' : 's'}`
    const options: MultiSelectorOption[] = []
    filterDimensions.sources.forEach((option) => {
      options.push({
        id: option.id,
        label: option.label,
        description: formatCountLabel(option.count),
        groupId: 'sourceFilters',
        count: option.count,
      })
    })
    filterDimensions.branches.forEach((option) => {
      options.push({
        id: option.id,
        label: option.label,
        description: formatCountLabel(option.count),
        groupId: 'branchFilters',
        count: option.count,
      })
    })
    filterDimensions.tags.forEach((option) => {
      options.push({
        id: option.id,
        label: option.label,
        description: formatCountLabel(option.count),
        groupId: 'tagFilters',
        count: option.count,
      })
    })
    RECENCY_PRESETS.forEach((option) => {
      options.push({
        id: option.id,
        label: option.label,
        description: option.description,
        groupId: 'recency',
      })
    })
    return options
  }, [filterDimensions])

  const multiSelectorValue = useMemo<MultiSelectorValue>(
    () => ({
      sourceFilters: filters.sourceFilters,
      branchFilters: filters.branchFilters,
      tagFilters: filters.tagFilters,
      recency: filters.recency === 'all' ? [] : [filters.recency],
    }),
    [filters.branchFilters, filters.recency, filters.sourceFilters, filters.tagFilters],
  )

  const handleMultiSelectorChange = useCallback((value: MultiSelectorValue) => {
    persistFilters((prev) => ({
      ...prev,
      sourceFilters: value.sourceFilters ?? [],
      branchFilters: value.branchFilters ?? [],
      tagFilters: value.tagFilters ?? [],
      recency: (value.recency?.[0] as SessionRecencyPreset | undefined) ?? 'all',
    }))
  }, [persistFilters])

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
              const matchesSource =
                filters.sourceFilters.length === 0 || filters.sourceFilters.includes(session.source);
              if (!matchesSource) return false;
              const branchName = (session.branch || 'unknown').toLowerCase();
              const matchesBranch =
                normalizedBranchFilters.length === 0 || normalizedBranchFilters.includes(branchName);
              if (!matchesBranch) return false;
              const tagSet = session.tags?.map((tag) => tag.toLowerCase()) ?? [];
              const matchesTags =
                normalizedTagFilters.length === 0 || tagSet.some((tag) => normalizedTagFilters.includes(tag));
              if (!matchesTags) return false;
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
    filters.sourceFilters,
    normalizedBranchFilters,
    normalizedTagFilters,
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
    persistFilters(() => cloneFilters(defaultFilterState));
    setExpandedGroupIds([]);
    commitSessionPreset('all');
    onSelectionChange?.(null);
  }, [commitSessionPreset, onSelectionChange, persistFilters]);

  const activeBadges = useMemo<ActiveFilterBadge[]>(() => buildActiveFilterBadges(filters), [filters]);
  const handleBadgeClear = useCallback((badgeKey: FilterBadgeKey) => {
    persistFilters((prev) => {
      if (badgeKey === 'size') {
        return { ...prev, sizeMinValue: '', sizeMaxValue: '' };
      }
      if (badgeKey === 'timestamp') {
        return { ...prev, timestampFrom: '', timestampTo: '' };
      }
      return prev;
    });
  }, [persistFilters]);

  const hasResults = filteredGroups.length > 0;
  const datasetEmpty = accessibleAssets.length === 0;

  return {
    filters,
    sessionPreset,
    applyPreset,
    updateFilter,
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
    multiSelectorGroups,
    multiSelectorOptions,
    multiSelectorValue,
    handleMultiSelectorChange,
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
    sourceFilters: [],
    branchFilters: [],
    tagFilters: [],
    recency: 'all' as const,
  } satisfies SessionExplorerFilterState;
}

function resolveTimestampFrom(manual?: number, recency?: number) {
  const sentinel = Number.NEGATIVE_INFINITY
  const normalizedManual = typeof manual === 'number' && Number.isFinite(manual) ? manual : sentinel
  const normalizedRecency = typeof recency === 'number' && Number.isFinite(recency) ? recency : sentinel
  const candidate = Math.max(normalizedManual, normalizedRecency)
  return candidate === sentinel ? undefined : candidate
}
