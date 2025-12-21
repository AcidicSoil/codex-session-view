import { useEffect, useMemo } from 'react'
import { logInfo } from '~/lib/logger'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import type { BranchGroup, RepositoryGroup } from './sessionExplorerTypes'
import {
  aggregateByRepository,
  getSortValue,
  matchesSearchText,
  sortSessions,
} from './sessionExplorerUtils'

interface BuildGroupResult {
  groups: Array<RepositoryGroup & { primarySortValue: number }>
  filteredSessionCount: number
}

interface UseSessionExplorerGroupsOptions {
  sessionAssets: DiscoveredSessionAsset[]
  searchMatchers: string[]
  sizeMinBytes?: number
  sizeMaxBytes?: number
  timestampFromMs?: number
  timestampToMs?: number
  sortKey: string
  sortDir: 'asc' | 'desc'
}

export function useSessionExplorerGroups({
  sessionAssets,
  searchMatchers,
  sizeMinBytes,
  sizeMaxBytes,
  timestampFromMs,
  timestampToMs,
  sortKey,
  sortDir,
}: UseSessionExplorerGroupsOptions) {
  const accessibleAssets = useMemo(
    () => sessionAssets.filter((asset) => typeof asset.url === 'string' && asset.url.includes('/api/uploads/')),
    [sessionAssets],
  )

  const repositoryGroups = useMemo(
    () => aggregateByRepository(accessibleAssets),
    [accessibleAssets],
  )

  useEffect(() => {
    const repoCount = new Set(repositoryGroups.map((group) => group.repoName)).size
    logInfo('viewer.explorer', 'Computed session explorer view model', {
      totalSessions: accessibleAssets.length,
      repoCount,
      groupCount: repositoryGroups.length,
    })
  }, [accessibleAssets.length, repositoryGroups])

  const { groups: filteredGroups, filteredSessionCount } = useMemo<BuildGroupResult>(() => {
    const min = typeof sizeMinBytes === 'number' ? sizeMinBytes : undefined
    const max = typeof sizeMaxBytes === 'number' ? sizeMaxBytes : undefined
    const from = typeof timestampFromMs === 'number' ? timestampFromMs : undefined
    const to = typeof timestampToMs === 'number' ? timestampToMs : undefined
    const groups = repositoryGroups
      .map((group) => {
        const filteredBranches = group.branches
          .map((branch) => {
            const filteredSessions = branch.sessions.filter((session) => {
              const matchesSearch = searchMatchers.length
                ? matchesSearchText(searchMatchers, group, session)
                : true
              if (!matchesSearch) return false
              const size = session.size ?? 0
              const meetsMin = min === undefined || size >= min
              const meetsMax = max === undefined || size <= max
              if (!meetsMin || !meetsMax) return false
              const sessionTimestamp = session.sortKey ?? 0
              const meetsFrom = from === undefined || sessionTimestamp >= from
              const meetsTo = to === undefined || sessionTimestamp <= to
              return meetsFrom && meetsTo
            })
            if (!filteredSessions.length) return null
            const sortedSessions = sortSessions(filteredSessions, sortKey, sortDir)
            const primarySortValue = getSortValue(sortedSessions[0], sortKey) ?? 0
            return {
              ...branch,
              sessions: sortedSessions,
              primarySortValue,
            }
          })
          .filter(Boolean) as Array<BranchGroup & { primarySortValue: number }>

        const branchDirection = sortDir === 'asc' ? 1 : -1
        const sortedBranches = filteredBranches.sort((a, b) => {
          const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0)
          if (diff !== 0) return branchDirection * diff
          return a.name.localeCompare(b.name)
        })

        if (!sortedBranches.length) return null
        const flattenedSessions = sortedBranches.flatMap((branch) => branch.sessions)
        const primarySortValue = sortedBranches[0]?.primarySortValue ?? 0
        const filteredNamedBranches = sortedBranches.filter(
          (branch) =>
            branch.name && branch.name.trim().length > 0 && branch.name.toLowerCase() !== 'unknown'
        )
        const branchCount = filteredNamedBranches.length
        const hasUnknownBranch = sortedBranches.some((branch) => branch.name.toLowerCase() === 'unknown')
        return {
          ...group,
          sessions: flattenedSessions,
          branches: sortedBranches.map(({ primarySortValue: _p, ...rest }) => rest),
          branchCount,
          hasUnknownBranch,
          primarySortValue,
        }
      })
      .filter(Boolean) as Array<RepositoryGroup & { primarySortValue: number }>

    const sortedGroups = groups.sort((a, b) => {
      const direction = sortDir === 'asc' ? 1 : -1
      const diff = (a.primarySortValue ?? 0) - (b.primarySortValue ?? 0)
      if (diff !== 0) {
        return direction * diff
      }
      return a.label.localeCompare(b.label)
    })

    const total = sortedGroups.reduce((count, group) => count + group.sessions.length, 0)
    return { groups: sortedGroups, filteredSessionCount: total }
  }, [
    repositoryGroups,
    searchMatchers,
    sizeMinBytes,
    sizeMaxBytes,
    sortKey,
    sortDir,
    timestampFromMs,
    timestampToMs,
  ])

  return {
    accessibleAssets,
    repositoryGroups,
    filteredGroups,
    filteredSessionCount,
  }
}
