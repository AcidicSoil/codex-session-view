import { useEffect } from 'react'
import { logDebug } from '~/lib/logger'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import type { RepositoryGroup, SessionExplorerFilterState } from './sessionExplorerTypes'
import { buildFilterModel } from './sessionExplorerUtils'

interface SelectionSyncOptions {
  accessibleAssets: DiscoveredSessionAsset[]
  filteredGroups: RepositoryGroup[]
  selectedSessionPath?: string | null
  filters: SessionExplorerFilterState
  sizeMinBytes?: number
  sizeMaxBytes?: number
  timestampFromMs?: number
  timestampToMs?: number
  onSelectionChange?: (path: string | null) => void
}

export function useSessionExplorerSelectionSync({
  accessibleAssets,
  filteredGroups,
  selectedSessionPath,
  filters,
  sizeMinBytes,
  sizeMaxBytes,
  timestampFromMs,
  timestampToMs,
  onSelectionChange,
}: SelectionSyncOptions) {
  useEffect(() => {
    if (!selectedSessionPath) return
    const stillVisible = filteredGroups.some((group) =>
      group.sessions.some((session) => session.path === selectedSessionPath),
    )
    if (!stillVisible) {
      const existsInMemory = accessibleAssets.some((session) => session.path === selectedSessionPath)
      if (existsInMemory) {
        logDebug('viewer.explorer', 'Selected session hidden by filters', {
          selectedSessionPath,
          filterModel: buildFilterModel(filters, {
            sizeMinBytes,
            sizeMaxBytes,
            timestampFromMs,
            timestampToMs,
          }),
        })
        onSelectionChange?.(null)
      }
    }
  }, [
    accessibleAssets,
    filteredGroups,
    filters,
    onSelectionChange,
    selectedSessionPath,
    sizeMaxBytes,
    sizeMinBytes,
    timestampFromMs,
    timestampToMs,
  ])
}
