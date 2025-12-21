import { useCallback, useMemo, useState } from 'react';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { type ActiveFilterBadge, type FilterBadgeKey } from './sessionExplorerTypes';
import { buildActiveFilterBadges } from './sessionExplorerUtils'
import { useSessionExplorerFilterState } from './sessionExplorerFiltersState'
import { useSessionExplorerFilterDerived } from './sessionExplorerFilters'
import { useSessionExplorerGroups } from './sessionExplorerGroups'
import { useSessionExplorerSelectionSync } from './sessionExplorerSelection'
import {
  useSessionExplorerEmptyStateLogging,
  useSessionExplorerFilterLogging,
  useSessionExplorerGroupExpansion,
  useSessionExplorerModelLogging,
  useSessionExplorerRangeValidation,
} from './sessionExplorerLogging'
import { useSessionExplorerAccordion } from './sessionExplorerAccordion'

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
  const { filters, commitFilters, updateFilter, resetFilters: resetFiltersInternal } =
    useSessionExplorerFilterState()
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [loadingRepoId, setLoadingRepoId] = useState<string | null>(null);
  const {
    searchMatchers,
    sizeMinBytes,
    sizeMaxBytes,
    timestampFromMs,
    timestampToMs,
  } = useSessionExplorerFilterDerived(filters, snapshotTimestamp)

  const {
    accessibleAssets,
    repositoryGroups,
    filteredGroups,
    filteredSessionCount,
  } = useSessionExplorerGroups({
    sessionAssets,
    searchMatchers,
    sizeMinBytes,
    sizeMaxBytes,
    timestampFromMs,
    timestampToMs,
    sortKey: filters.sortKey,
    sortDir: filters.sortDir,
  })

  useSessionExplorerRangeValidation({ sizeMinBytes, sizeMaxBytes, timestampFromMs, timestampToMs })
  useSessionExplorerModelLogging({ accessibleAssets, repositoryGroups })
  useSessionExplorerFilterLogging({
    filters,
    filteredSessionCount,
    sizeMinBytes,
    sizeMaxBytes,
    timestampFromMs,
    timestampToMs,
  })
  useSessionExplorerSelectionSync({
    accessibleAssets,
    filteredGroups,
    selectedSessionPath,
    filters,
    sizeMinBytes,
    sizeMaxBytes,
    timestampFromMs,
    timestampToMs,
    onSelectionChange,
  })
  useSessionExplorerGroupExpansion({ filteredGroups, selectedSessionPath, setExpandedGroupIds })
  useSessionExplorerEmptyStateLogging({
    accessibleAssets,
    filteredSessionCount,
    filters,
    repositoryGroups,
    sizeMinBytes,
    sizeMaxBytes,
    timestampFromMs,
    timestampToMs,
  })

  const { handleAccordionChange } = useSessionExplorerAccordion({
    expandedGroupIds,
    filteredGroups,
    setExpandedGroupIds,
    setLoadingRepoId,
  })

  const resetFilters = useCallback(() => {
    resetFiltersInternal()
    setExpandedGroupIds([]);
    onSelectionChange?.(null);
  }, [onSelectionChange, resetFiltersInternal]);

  const activeBadges = useMemo<ActiveFilterBadge[]>(() => buildActiveFilterBadges(filters), [filters]);
  const handleBadgeClear = useCallback((badgeKey: FilterBadgeKey) => {
    commitFilters((prev) => {
      if (badgeKey === 'size') {
        return { ...prev, sizeMinValue: '', sizeMaxValue: '' };
      }
      if (badgeKey === 'timestamp') {
        return { ...prev, timestampFrom: '', timestampTo: '' };
      }
      return prev;
    });
  }, [commitFilters]);

  const hasResults = filteredGroups.length > 0;
  const datasetEmpty = accessibleAssets.length === 0;

  return {
    filters,
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
  };
}
