import { useCallback } from 'react'
import { logDebug } from '~/lib/logger'
import type { RepositoryGroup } from './sessionExplorerTypes'

interface UseSessionExplorerAccordionOptions {
  expandedGroupIds: string[]
  filteredGroups: RepositoryGroup[]
  setExpandedGroupIds: React.Dispatch<React.SetStateAction<string[]>>
  setLoadingRepoId: React.Dispatch<React.SetStateAction<string | null>>
}

export function useSessionExplorerAccordion({
  expandedGroupIds,
  filteredGroups,
  setExpandedGroupIds,
  setLoadingRepoId,
}: UseSessionExplorerAccordionOptions) {
  const handleRepoToggle = useCallback(
    (group: RepositoryGroup, shouldExpand: boolean) => {
      logDebug('viewer.explorer', 'Toggled repository group', {
        groupId: group.id,
        repoName: group.repoName,
        branchCount: group.branchCount,
        previousOpenState: !shouldExpand,
        nextOpenState: shouldExpand,
      })
      if (shouldExpand) {
        setLoadingRepoId(group.id)
        const simulatedDelay = group.sessions.length > 20 ? 400 : group.sessions.length > 8 ? 260 : 160
        setTimeout(() => {
          setLoadingRepoId((current) => (current === group.id ? null : current))
        }, simulatedDelay)
      } else {
        setLoadingRepoId((current) => (current === group.id ? null : current))
      }
    },
    [setLoadingRepoId],
  )

  const handleAccordionChange = useCallback(
    (nextValue: string[]) => {
      setExpandedGroupIds(nextValue)
      const added = nextValue.find((id) => !expandedGroupIds.includes(id))
      if (added) {
        const target = filteredGroups.find((group) => group.id === added)
        if (target) {
          handleRepoToggle(target, true)
        }
      }
      const removed = expandedGroupIds.find((id) => !nextValue.includes(id))
      if (removed) {
        const target = filteredGroups.find((group) => group.id === removed)
        if (target) {
          handleRepoToggle(target, false)
        }
      }
    },
    [expandedGroupIds, filteredGroups, handleRepoToggle, setExpandedGroupIds],
  )

  return { handleAccordionChange, handleRepoToggle }
}
