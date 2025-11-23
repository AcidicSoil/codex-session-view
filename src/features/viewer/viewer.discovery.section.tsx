import { Component, type ErrorInfo, type ReactNode, useEffect, useRef, useState } from 'react'
import { useLoaderData, useRouter, useSearch } from '@tanstack/react-router'
import { DiscoveryPanel } from '~/components/viewer/DiscoveryPanel'
import { toast } from 'sonner'
import type { FileLoaderHook } from '~/hooks/useFileLoader'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { logDebug, logError, logInfo } from '~/lib/logger'
import { VIEWER_ROUTE_ID, VIEWER_ROUTE_PATH, type ViewerSearch } from './route-id'
import type { ViewerSnapshot } from './viewer.loader'
import { arraysEqual } from './viewer.search'

interface ViewerDiscoveryOptions {
  loader: FileLoaderHook
}

function useViewerDiscovery({ loader }: ViewerDiscoveryOptions) {
  const router = useRouter()
  const loaderSnapshot = useLoaderData({ from: VIEWER_ROUTE_ID }) as ViewerSnapshot | undefined
  const search = useSearch({ from: VIEWER_ROUTE_ID }) ?? { filters: [], expanded: [], sizeMinMb: undefined }
  const [snapshot, setSnapshot] = useState<ViewerSnapshot | undefined>(loaderSnapshot)
  const hasResolvedOnceRef = useRef(Boolean(loaderSnapshot))
  const loggedMissingRef = useRef(false)
  const [loadingSessionPath, setLoadingSessionPath] = useState<string | null>(null)

  useEffect(() => {
    if (loaderSnapshot) {
      setSnapshot(loaderSnapshot)
      hasResolvedOnceRef.current = true
      loggedMissingRef.current = false
      return
    }
    if (!hasResolvedOnceRef.current || loggedMissingRef.current) return
    loggedMissingRef.current = true
    logError('viewer.discovery', 'Lost viewer snapshot after initial load', { search })
  }, [loaderSnapshot, search])

  const setFilters = (next: string[]) => {
    if (arraysEqual(next, search.filters)) return
    logDebug('viewer.filters', 'Updating filters', { next })
    router.navigate({
      to: VIEWER_ROUTE_PATH,
      search: (prev) => {
        const prevSearch = (prev as ViewerSearch | undefined) ?? search
        const prevExpanded = Array.isArray(prevSearch.expanded) ? prevSearch.expanded : search.expanded
        return { filters: next, expanded: prevExpanded, sizeMinMb: prevSearch.sizeMinMb }
      },
      replace: true,
    })
  }

  const setExpanded = (next: string[]) => {
    if (arraysEqual(next, search.expanded)) return
    logDebug('viewer.filters', 'Updating expanded repos', { next })
    router.navigate({
      to: VIEWER_ROUTE_PATH,
      search: (prev) => {
        const prevSearch = (prev as ViewerSearch | undefined) ?? search
        const prevFilters = Array.isArray(prevSearch.filters) ? prevSearch.filters : search.filters
        return { expanded: next, filters: prevFilters, sizeMinMb: prevSearch.sizeMinMb }
      },
      replace: true,
    })
  }

  const setMinSizeMb = (value?: number) => {
    const normalized = value !== undefined && Number.isFinite(value) && value >= 0 ? Number(value) : undefined
    router.navigate({
      to: VIEWER_ROUTE_PATH,
      search: (prev) => {
        const prevSearch = (prev as ViewerSearch | undefined) ?? search
        return {
          filters: prevSearch.filters ?? search.filters,
          expanded: prevSearch.expanded ?? search.expanded,
          sizeMinMb: normalized,
        }
      },
      replace: true,
    })
  }

  const handleSessionOpen = async (asset: DiscoveredSessionAsset) => {
    if (!asset.url || asset.url.startsWith('file://')) {
      toast.error('Session not accessible', {
        description: 'This session must be uploaded or served over HTTP before loading.',
      })
      logError('viewer.discovery', 'Unsupported session URL protocol', { path: asset.path, url: asset.url })
      return
    }
    setLoadingSessionPath(asset.path)
    logInfo('viewer.discovery', 'Loading session asset into timeline', { path: asset.path })
    try {
      const response = await fetch(asset.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch session (${response.status})`)
      }
      const blob = await response.blob()
      const filename = asset.path.split(/[/\\]/).pop() ?? 'session.jsonl'
      const file = new File([blob], filename, { type: blob.type || 'application/json' })
      await loader.start(file)
      toast.success('Session loaded', { description: filename })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to load session', { description: message })
      logError('viewer.discovery', 'Failed to load session asset', error instanceof Error ? error : new Error(message))
    } finally {
      setLoadingSessionPath((current) => (current === asset.path ? null : current))
    }
  }

  return {
    snapshot: snapshot ?? loaderSnapshot,
    filters: search.filters,
    expanded: search.expanded,
    sizeMinMb: search.sizeMinMb,
    setFilters,
    setExpanded,
    setMinSizeMb,
    onSessionOpen: handleSessionOpen,
    loadingSessionPath,
  }
}

interface DiscoverySectionProps {
  loader: FileLoaderHook
}

export function DiscoverySection({ loader }: DiscoverySectionProps) {
  const {
    snapshot,
    filters,
    expanded,
    sizeMinMb,
    setFilters,
    setExpanded,
    setMinSizeMb,
    onSessionOpen,
    loadingSessionPath,
  } = useViewerDiscovery({ loader })
  if (!snapshot) {
    return <DiscoveryUnavailable />
  }
  return (
    <SessionExplorerBoundary resetKey={snapshot.generatedAt}>
      <DiscoveryPanel
        projectFiles={snapshot.projectFiles}
        sessionAssets={snapshot.sessionAssets}
        generatedAtMs={snapshot.generatedAt}
        selectedFilterIds={filters}
        onSelectedFilterIdsChange={setFilters}
        expandedRepoIds={expanded}
        onExpandedRepoIdsChange={setExpanded}
        minSizeMb={sizeMinMb}
        onMinSizeMbChange={setMinSizeMb}
        onSessionOpen={onSessionOpen}
        loadingSessionPath={loadingSessionPath}
      />
    </SessionExplorerBoundary>
  )
}

class SessionExplorerBoundary extends Component<{ children: ReactNode; resetKey?: number | string }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError('viewer.discovery', 'Session explorer crashed', { error, info })
  }

  componentDidUpdate(prevProps: Readonly<{ resetKey?: number | string }>) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  render() {
    if (this.state.hasError) {
      return <DiscoveryUnavailable message="Session explorer temporarily unavailable." />
    }
    return this.props.children
  }
}

function DiscoveryUnavailable({ message }: { message?: string }) {
  return (
    <section className="rounded-xl border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p className="font-semibold text-destructive">{message ?? 'Session explorer currently unavailable'}</p>
      <p className="text-xs text-muted-foreground">
        Failed to reuse the last discovery snapshot. Check the viewer logs for errors and refresh when ready.
      </p>
    </section>
  )
}
