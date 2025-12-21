import { useEffect, useRef } from 'react'
import { logDebug, logError, logInfo, logWarn } from '~/lib/logger'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import type { RepositoryGroup, SessionExplorerFilterState } from './sessionExplorerTypes'
import { buildFilterModel } from './sessionExplorerUtils'

interface RangeValidationOptions {
  sizeMinBytes?: number
  sizeMaxBytes?: number
  timestampFromMs?: number
  timestampToMs?: number
}

export function useSessionExplorerRangeValidation({
  sizeMinBytes,
  sizeMaxBytes,
  timestampFromMs,
  timestampToMs,
}: RangeValidationOptions) {
  useEffect(() => {
    if (sizeMinBytes !== undefined && sizeMaxBytes !== undefined && sizeMinBytes > sizeMaxBytes) {
      logWarn('viewer.filters', 'Manual size range invalid', { sizeMinBytes, sizeMaxBytes })
    }
  }, [sizeMinBytes, sizeMaxBytes])

  useEffect(() => {
    if (timestampFromMs && timestampToMs && timestampFromMs > timestampToMs) {
      logWarn('viewer.filters', 'Timestamp range invalid', {
        timestampFromMs,
        timestampToMs,
      })
    }
  }, [timestampFromMs, timestampToMs])
}

export function useSessionExplorerModelLogging({
  accessibleAssets,
  repositoryGroups,
}: {
  accessibleAssets: DiscoveredSessionAsset[]
  repositoryGroups: RepositoryGroup[]
}) {
  const viewModelLogRef = useRef<{ total: number; groups: number } | null>(null)
  useEffect(() => {
    const repoCount = new Set(repositoryGroups.map((group) => group.repoName)).size
    if (
      viewModelLogRef.current?.total === accessibleAssets.length &&
      viewModelLogRef.current?.groups === repositoryGroups.length
    ) {
      return
    }
    logInfo('viewer.explorer', 'Computed session explorer view model', {
      totalSessions: accessibleAssets.length,
      repoCount,
      groupCount: repositoryGroups.length,
    })
    viewModelLogRef.current = { total: accessibleAssets.length, groups: repositoryGroups.length }
  }, [accessibleAssets.length, repositoryGroups])
}

export function useSessionExplorerFilterLogging({
  filters,
  filteredSessionCount,
  sizeMinBytes,
  sizeMaxBytes,
  timestampFromMs,
  timestampToMs,
}: {
  filters: SessionExplorerFilterState
  filteredSessionCount: number
  sizeMinBytes?: number
  sizeMaxBytes?: number
  timestampFromMs?: number
  timestampToMs?: number
}) {
  const filterLogRef = useRef<{ modelKey: string; count: number }>({
    modelKey: '',
    count: filteredSessionCount,
  })

  useEffect(() => {
    const filterModel = buildFilterModel(filters, {
      sizeMinBytes,
      sizeMaxBytes,
      timestampFromMs,
      timestampToMs,
    })
    const modelKey = JSON.stringify(filterModel)
    if (filterLogRef.current.modelKey === modelKey && filterLogRef.current.count === filteredSessionCount) {
      return
    }
    logInfo('viewer.filters', 'Session explorer filters updated', {
      filterModel,
      beforeCount: filterLogRef.current.count,
      afterCount: filteredSessionCount,
      navigation: 'url-search',
    })
    filterLogRef.current = { modelKey, count: filteredSessionCount }
  }, [filteredSessionCount, filters, sizeMaxBytes, sizeMinBytes, timestampFromMs, timestampToMs])
}

export function useSessionExplorerEmptyStateLogging({
  accessibleAssets,
  filteredSessionCount,
  filters,
  repositoryGroups,
  sizeMinBytes,
  sizeMaxBytes,
  timestampFromMs,
  timestampToMs,
}: {
  accessibleAssets: DiscoveredSessionAsset[]
  filteredSessionCount: number
  filters: SessionExplorerFilterState
  repositoryGroups: RepositoryGroup[]
  sizeMinBytes?: number
  sizeMaxBytes?: number
  timestampFromMs?: number
  timestampToMs?: number
}) {
  useEffect(() => {
    if (accessibleAssets.length > 0 && filteredSessionCount === 0) {
      const filterModel = buildFilterModel(filters, {
        sizeMinBytes,
        sizeMaxBytes,
        timestampFromMs,
        timestampToMs,
      })
      logError('viewer.explorer', 'Filters produced zero sessions while memory still populated', {
        filterModel,
        totalSessions: accessibleAssets.length,
        groupSamples: repositoryGroups.slice(0, 5).map((group) => group.id),
      })
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
  ])
}

export function useSessionExplorerGroupExpansion({
  filteredGroups,
  selectedSessionPath,
  setExpandedGroupIds,
}: {
  filteredGroups: RepositoryGroup[]
  selectedSessionPath?: string | null
  setExpandedGroupIds: React.Dispatch<React.SetStateAction<string[]>>
}) {
  useEffect(() => {
    const visibleIds = new Set(filteredGroups.map((group) => group.id))
    setExpandedGroupIds((current) => {
      const next = current.filter((id) => visibleIds.has(id))
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current
      }
      return next
    })
  }, [filteredGroups, setExpandedGroupIds])

  useEffect(() => {
    if (!selectedSessionPath) return
    const owningGroup = filteredGroups.find((group) =>
      group.sessions.some((session) => session.path === selectedSessionPath),
    )
    if (!owningGroup) return
    setExpandedGroupIds((current) => {
      if (current.includes(owningGroup.id)) {
        return current
      }
      logDebug('viewer.explorer', 'Auto-expanded repository for selected session', {
        selectedSessionPath,
        groupId: owningGroup.id,
      })
      return [...current, owningGroup.id]
    })
  }, [filteredGroups, selectedSessionPath, setExpandedGroupIds])
}
