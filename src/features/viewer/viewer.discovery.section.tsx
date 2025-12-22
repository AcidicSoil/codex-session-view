import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useLoaderData } from '@tanstack/react-router'
import { DiscoveryPanel } from '~/components/viewer/DiscoveryPanel'
import { toast } from 'sonner'
import type { FileLoaderHook } from '~/hooks/useFileLoader'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { logError, logInfo, logWarn } from '~/lib/logger'
import { mergeSessionAssets, sortSessionAssets } from '~/lib/viewerDiscovery'
import { VIEWER_ROUTE_ID } from './route-id'
import type { ViewerSnapshot } from './viewer.loader'

interface ViewerDiscoveryOptions {
  loader: FileLoaderHook
}

type LiveWatcherPayload =
  | { type: 'ready' | 'update'; asset: DiscoveredSessionAsset }
  | { type: 'error'; message: string }
  | { type: 'ping' }

export interface ViewerDiscoveryState {
  snapshot?: ViewerSnapshot
  projectFiles: string[]
  sessionAssets: DiscoveredSessionAsset[]
  appendSessionAssets: (assets: DiscoveredSessionAsset[], reason: string) => void
  onSessionOpen: (asset: DiscoveredSessionAsset) => Promise<void> | void
  loadingSessionPath: string | null
  selectedSessionPath: string | null
  setSelectedSessionPath: (path: string | null) => void
  stopLiveWatcher: () => void
}

export function useViewerDiscovery({ loader }: ViewerDiscoveryOptions): ViewerDiscoveryState {
  const loaderSnapshot = useLoaderData({ from: VIEWER_ROUTE_ID }) as ViewerSnapshot | undefined
  const [snapshot, setSnapshot] = useState<ViewerSnapshot | undefined>(loaderSnapshot)
  const [sessionAssets, setSessionAssets] = useState<DiscoveredSessionAsset[]>(loaderSnapshot?.sessionAssets ?? [])
  const [projectFiles, setProjectFiles] = useState(loaderSnapshot?.projectFiles ?? [])
  const hasResolvedOnceRef = useRef(Boolean(loaderSnapshot))
  const loggedMissingRef = useRef(false)
  const [loadingSessionPath, setLoadingSessionPath] = useState<string | null>(null)
  const [selectedSessionPath, setSelectedSessionPath] = useState<string | null>(null)
  const selectedSessionRef = useRef<string | null>(null)
  const liveWatcherRef = useRef<EventSource | null>(null)
  const liveReloadRef = useRef<Promise<void> | null>(null)

  useEffect(() => {
    selectedSessionRef.current = selectedSessionPath
  }, [selectedSessionPath])

  const stopLiveWatcher = useCallback(() => {
    liveWatcherRef.current?.close()
    liveWatcherRef.current = null
  }, [])

  useEffect(() => () => stopLiveWatcher(), [stopLiveWatcher])

  const appendSessionAssets = useCallback((assets: DiscoveredSessionAsset[], reason: string) => {
    if (!assets.length) return
    setSessionAssets((current) => {
      const merged = sortSessionAssets(mergeSessionAssets(current, assets))
      logInfo('viewer.discovery', 'Merged session assets into explorer', {
        reason,
        before: current.length,
        after: merged.length,
        added: assets.length,
      })
      return merged
    })
  }, [])

  const reloadActiveSession = useCallback(
    async (asset: DiscoveredSessionAsset) => {
      if (liveReloadRef.current) {
        return liveReloadRef.current
      }
      const task = (async () => {
        try {
          await loader.loadSession({ sessionId: asset.sessionId, path: asset.path })
          logInfo('viewer.discovery', 'Live session refreshed', { path: asset.path })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          logError('viewer.discovery', 'Failed to refresh live session asset', error instanceof Error ? error : new Error(message))
          toast.error('Failed to refresh session', { description: message })
        }
      })()
      liveReloadRef.current = task.finally(() => {
        liveReloadRef.current = null
      })
      return liveReloadRef.current
    },
    [loader],
  )

  const handleLiveWatcherPayload = useCallback(
    (payload: LiveWatcherPayload) => {
      if (payload.type === 'ping') {
        return
      }
      if (payload.type === 'error') {
        toast.error('Live session updates unavailable', { description: payload.message })
        stopLiveWatcher()
        return
      }
      appendSessionAssets([payload.asset], payload.type === 'ready' ? 'live-ready' : 'live-update')
      if (payload.type === 'update' && selectedSessionRef.current === payload.asset.path) {
        void reloadActiveSession(payload.asset)
      }
    },
    [appendSessionAssets, reloadActiveSession, stopLiveWatcher],
  )

  const startLiveWatcher = useCallback(
    (asset: DiscoveredSessionAsset) => {
      const uploadId = extractUploadIdFromUrl(asset.url)
      if (
        typeof window === 'undefined' ||
        typeof EventSource === 'undefined' ||
        asset.source === 'upload' ||
        !uploadId
      ) {
        stopLiveWatcher()
        return
      }
      stopLiveWatcher()
      const source = new EventSource(`/api/uploads/${uploadId}/watch`)
      liveWatcherRef.current = source
      source.onmessage = (event) => {
        if (!event.data) {
          return
        }
        try {
          const payload: LiveWatcherPayload = JSON.parse(event.data)
          handleLiveWatcherPayload(payload)
        } catch (error) {
          logError('viewer.discovery', 'Failed to parse live watcher payload', error as Error)
        }
      }
      source.onerror = () => {
        logWarn('viewer.discovery', 'Live session watcher disconnected', { path: asset.path })
        stopLiveWatcher()
      }
    },
    [handleLiveWatcherPayload, stopLiveWatcher],
  )

  useEffect(() => {
    if (loaderSnapshot) {
      setSnapshot(loaderSnapshot)
      setSessionAssets(loaderSnapshot.sessionAssets)
      setProjectFiles(loaderSnapshot.projectFiles)
      hasResolvedOnceRef.current = true
      loggedMissingRef.current = false
      return
    }
    if (!hasResolvedOnceRef.current || loggedMissingRef.current) return
    loggedMissingRef.current = true
    logError('viewer.discovery', 'Lost viewer snapshot after initial load')
  }, [loaderSnapshot])

  const handleSessionOpen = async (asset: DiscoveredSessionAsset) => {
    const isSessionUploadUrl = typeof asset.url === 'string' && asset.url.includes('/api/uploads/')
    if (!asset.url || !isSessionUploadUrl) {
      toast.error('Session not accessible', {
        description: 'Expected a session upload URL but found a non-HTTP source.',
      })
      logError('viewer.discovery', 'Unsupported session URL protocol', { path: asset.path, url: asset.url })
      return
    }
    setSelectedSessionPath(asset.path)
    setLoadingSessionPath(asset.path)
    logInfo('viewer.discovery', 'Loading session asset into timeline', { path: asset.path })
    try {
      await loader.loadSession({ sessionId: asset.sessionId, path: asset.path })
      const filename = asset.path.split(/[/\\]/).pop() ?? 'session.jsonl'
      toast.success('Session loaded', { description: filename })
      if (asset.source !== 'upload') {
        startLiveWatcher(asset)
      } else {
        stopLiveWatcher()
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      toast.error('Failed to load session', { description: message })
      logError('viewer.discovery', 'Failed to load session asset', error instanceof Error ? error : new Error(message))
      stopLiveWatcher()
    } finally {
      setLoadingSessionPath((current) => (current === asset.path ? null : current))
    }
  }

  return {
    snapshot: snapshot ?? loaderSnapshot,
    projectFiles,
    sessionAssets,
    appendSessionAssets,
    onSessionOpen: handleSessionOpen,
    loadingSessionPath,
    selectedSessionPath,
    setSelectedSessionPath,
    stopLiveWatcher,
  }
}

interface DiscoverySectionProps extends ViewerDiscoveryState {
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void
  onFiltersRender?: (node: React.ReactNode | null) => void
  uploadDrawerContent?: React.ReactNode
  onSessionEject?: () => void
  isSessionEjecting?: boolean
}

export function DiscoverySection(props: DiscoverySectionProps) {
  const {
    snapshot,
    sessionAssets,
    onSessionOpen,
    loadingSessionPath,
    selectedSessionPath,
    setSelectedSessionPath,
    onAddSessionToChat,
    onFiltersRender,
    uploadDrawerContent,
    onSessionEject,
    isSessionEjecting,
  } = props
  if (!snapshot) {
    return <DiscoveryUnavailable />
  }
  return (
    <SessionExplorerBoundary resetKey={snapshot.generatedAt}>
      <DiscoveryPanel
        sessionAssets={sessionAssets}
        generatedAtMs={snapshot.generatedAt}
        onSessionOpen={onSessionOpen}
        loadingSessionPath={loadingSessionPath}
        selectedSessionPath={selectedSessionPath}
        onSelectionChange={setSelectedSessionPath}
        onAddSessionToChat={onAddSessionToChat}
        onFiltersRender={onFiltersRender}
        uploadDrawerContent={uploadDrawerContent}
        onSessionEject={onSessionEject}
        isSessionEjecting={isSessionEjecting}
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

function extractUploadIdFromUrl(url: string) {
  const match = url.match(/\/api\/uploads\/([^/?]+)/i)
  return match ? match[1] : null
}
