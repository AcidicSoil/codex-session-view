import { useRouter, useRouterState } from '@tanstack/react-router'
import { DiscoveryPanel } from '~/components/viewer/DiscoveryPanel'
import { logDebug } from '~/lib/logger'
import { VIEWER_ROUTE_ID, type ViewerSearch } from './route-id'
import type { ViewerSnapshot } from './viewer.loader'
import { arraysEqual } from './viewer.search'

type ViewerMatch = {
  id: string
  loaderData?: ViewerSnapshot
  search?: ViewerSearch
}

function useViewerMatch() {
  return useRouterState({
    select: (state) => state.matches.find((match) => match.id === VIEWER_ROUTE_ID) as ViewerMatch | undefined,
  })
}

function useViewerDiscovery() {
  const router = useRouter()
  const match = useViewerMatch()
  const search = match?.search ?? { filters: [], expanded: [] }

  const setFilters = (next: string[]) => {
    if (arraysEqual(next, search.filters)) return
    logDebug('viewer.filters', 'Updating filters', { next })
    router.navigate({
      to: VIEWER_ROUTE_ID,
      search: (prev: ViewerSearch) => ({ ...prev, filters: next }),
      replace: true,
    })
  }

  const setExpanded = (next: string[]) => {
    if (arraysEqual(next, search.expanded)) return
    logDebug('viewer.filters', 'Updating expanded repos', { next })
    router.navigate({
      to: VIEWER_ROUTE_ID,
      search: (prev: ViewerSearch) => ({ ...prev, expanded: next }),
      replace: true,
    })
  }

  return {
    snapshot: match?.loaderData,
    filters: search.filters,
    expanded: search.expanded,
    setFilters,
    setExpanded,
  }
}

export function DiscoverySection() {
  const { snapshot, filters, expanded, setFilters, setExpanded } = useViewerDiscovery()
  if (!snapshot) return null
  return (
    <DiscoveryPanel
      projectFiles={snapshot.projectFiles}
      sessionAssets={snapshot.sessionAssets}
      generatedAtMs={snapshot.generatedAt}
      selectedFilterIds={filters}
      onSelectedFilterIdsChange={setFilters}
      expandedRepoIds={expanded}
      onExpandedRepoIdsChange={setExpanded}
    />
  )
}
