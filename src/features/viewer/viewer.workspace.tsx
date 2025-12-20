import { ClientOnly, useLoaderData, useRouter, useRouterState } from '@tanstack/react-router'
import { useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { ViewerSnapshot } from './viewer.loader'
import { useViewerDiscovery } from './viewer.discovery.section'
import { useUploadController } from './viewer.upload.section'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { logInfo } from '~/lib/logger'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import { useFileLoader } from '~/hooks/useFileLoader'
import { applyViewerSearchUpdates, parseViewerSearch, viewerSearchToCommandFilter, viewerSearchToRangeState } from './viewer.search'
import { deriveSessionId, resolveSelectedSessionPath } from './viewer.workspace.utils'
import { VIEWER_INSPECTOR_ROUTE_PATH, VIEWER_ROUTE_ID } from './route-id'
import { useViewerWorkspaceChat } from './viewer.workspace.chat'
import {
  ViewerWorkspaceContext,
  type ViewerWorkspaceBoundaryProps,
  type ViewerWorkspaceContextValue,
  useOptionalViewerWorkspace,
  useViewerWorkspace,
} from './viewer.workspace.context'

export { useViewerWorkspace, useOptionalViewerWorkspace }

export function ViewerWorkspaceBoundary({ children, fallback }: ViewerWorkspaceBoundaryProps) {
  const existingContext = useContext(ViewerWorkspaceContext)
  if (existingContext) {
    return <>{children}</>
  }
  return (
    <ClientOnly fallback={fallback ?? null}>
      <ViewerWorkspaceProvider>{children}</ViewerWorkspaceProvider>
    </ClientOnly>
  )
}

export function ViewerWorkspaceProvider({ children }: { children: ReactNode }) {
  const loaderData = useLoaderData({ from: VIEWER_ROUTE_ID }) as ViewerSnapshot | undefined
  const loader = useFileLoader()
  const discovery = useViewerDiscovery({ loader })
  const {
    sessionAssets,
    appendSessionAssets,
    onSessionOpen,
    stopLiveWatcher,
    selectedSessionPath,
    setSelectedSessionPath,
  } = discovery
  const router = useRouter()
  const locationState = useRouterState({ select: (state) => state.location })
  const viewerSearch = useMemo(
    () => parseViewerSearch((locationState?.search as Record<string, unknown>) ?? {}),
    [locationState?.search],
  )
  const hydrateUiSettings = useUiSettingsStore((state) => state.hydrateFromSnapshot)
  const settingsHydratedRef = useRef(false)
  const openRuleInspector = useUiSettingsStore((state) => state.openRuleInspector)
  const lastSessionPath = useUiSettingsStore((state) => state.lastSessionPath)
  const setLastSessionPath = useUiSettingsStore((state) => state.setLastSessionPath)
  const setTimelineRange = useUiSettingsStore((state) => state.setTimelineRange)
  const setCommandFilter = useUiSettingsStore((state) => state.setCommandFilter)
  const pendingSessionIdRef = useRef<string | null>(null)

  if (!settingsHydratedRef.current) {
    const snapshotSource = loaderData?.uiSettings ? 'server' : 'guest'
    hydrateUiSettings(loaderData?.uiSettings ?? null, loaderData?.uiSettingsProfileId ?? null, snapshotSource)
    settingsHydratedRef.current = true
  }

  const activeSessionId = viewerSearch.sessionId ?? loaderData?.sessionId ?? 'session-default'

  const setActiveSessionId = useCallback(
    (nextSessionId: string) => {
      if (!nextSessionId || nextSessionId === activeSessionId) {
        if (nextSessionId === activeSessionId) {
          pendingSessionIdRef.current = null
        }
        return
      }
      pendingSessionIdRef.current = nextSessionId
      void router.navigate({
        search: (prev) =>
          applyViewerSearchUpdates((prev as Record<string, unknown>) ?? {}, (state) => ({
            ...state,
            sessionId: nextSessionId,
          })),
      })
    },
    [activeSessionId, router],
  )

  useEffect(() => {
    if (pendingSessionIdRef.current && pendingSessionIdRef.current === activeSessionId) {
      pendingSessionIdRef.current = null
    }
  }, [activeSessionId])

  useEffect(() => {
    setTimelineRange(viewerSearchToRangeState(viewerSearch))
    setCommandFilter(() => viewerSearchToCommandFilter(viewerSearch))
  }, [setCommandFilter, setTimelineRange, viewerSearch])

  useEffect(() => {
    if (selectedSessionPath) {
      setLastSessionPath(selectedSessionPath)
      return
    }
    if (!selectedSessionPath && lastSessionPath) {
      setSelectedSessionPath(lastSessionPath)
    }
  }, [selectedSessionPath, lastSessionPath, setLastSessionPath, setSelectedSessionPath])

  const sessionIdToAssetPath = useMemo(() => {
    const map = new Map<string, string>()
    for (const asset of sessionAssets) {
      map.set(deriveSessionId(asset.path), asset.path)
    }
    return map
  }, [sessionAssets])

  const selectedAsset = useMemo(() => {
    if (!selectedSessionPath) return null
    return sessionAssets.find((asset) => asset.path === selectedSessionPath) ?? null
  }, [sessionAssets, selectedSessionPath])

  const {
    sessionCoachState,
    setSessionCoachState,
    ruleSheetEntries,
    setRuleSheetEntries,
    refreshRuleInventory,
    chatPrefills,
    setChatPrefill,
    hookGate,
    setHookGate,
    handleAddTimelineEventToChat,
    handleAddSessionToChat,
    handleRemediationPrefill,
    handleFlaggedEventClick,
    focusEventIndex,
    setFocusEventIndex,
    flaggedEventMarkers,
    resolveEvidenceContext,
    sessionEvents,
    misalignments,
    refreshSessionCoach,
    bindSessionToAsset,
    activeAssetPath,
  } = useViewerWorkspaceChat({
    loaderData,
    activeSessionId,
    selectedAssetPath: selectedAsset?.path ?? null,
    setActiveSessionId,
    setSelectedSessionPath,
    router,
  })

  useEffect(() => {
    if (pendingSessionIdRef.current && pendingSessionIdRef.current !== activeSessionId) {
      return
    }
    const nextSelection = resolveSelectedSessionPath({
      activeSessionId,
      selectedSessionPath,
      sessionIdToAssetPath,
    })
    if (nextSelection !== undefined) {
      setSelectedSessionPath(nextSelection)
    }
  }, [activeSessionId, selectedSessionPath, setSelectedSessionPath, sessionIdToAssetPath])

  useEffect(() => {
    if (!selectedAsset) return
    const nextSessionId = deriveSessionId(selectedAsset.path)
    if (nextSessionId === activeSessionId || pendingSessionIdRef.current === nextSessionId) {
      return
    }
    pendingSessionIdRef.current = nextSessionId
    let cancelled = false
    const run = async () => {
      await bindSessionToAsset(nextSessionId, selectedAsset.path, { refresh: false })
      if (cancelled) {
        return
      }
      setActiveSessionId(nextSessionId)
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [selectedAsset, activeSessionId, bindSessionToAsset, setActiveSessionId])

  const uploadController = useUploadController({
    loader,
    onUploadsPersisted: useCallback(
      (assets: DiscoveredSessionAsset[]) => {
        appendSessionAssets(assets, 'upload')
        if (!assets.length) {
          return
        }
        const sortedBySortKey = [...assets].sort((a, b) => {
          const aKey = typeof a.sortKey === 'number' ? a.sortKey : Number.NEGATIVE_INFINITY
          const bKey = typeof b.sortKey === 'number' ? b.sortKey : Number.NEGATIVE_INFINITY
          return bKey - aKey
        })
        const newestBySortKey = sortedBySortKey.find((entry) => typeof entry.sortKey === 'number')
        const newest = newestBySortKey ?? assets[assets.length - 1]
        if (newest) {
          setSelectedSessionPath(newest.path)
          logInfo('viewer.explorer', 'Auto-selected newly persisted session', { path: newest.path })
        }
      },
      [appendSessionAssets, setSelectedSessionPath],
    ),
  })

  const handleSessionEject = useCallback(() => {
    if (uploadController.isEjecting) return
    uploadController.ejectSession()
    stopLiveWatcher()
    setSelectedSessionPath(null)
    setLastSessionPath(null)
    setSessionCoachState(null)
    setRuleSheetEntries([])
    setActiveSessionId('session-default')
    setFocusEventIndex(null)
  }, [
    setRuleSheetEntries,
    setSessionCoachState,
    setActiveSessionId,
    setFocusEventIndex,
    setLastSessionPath,
    stopLiveWatcher,
    uploadController,
  ])

  const ensureSessionAssetLoaded = useCallback(
    async (assetPath?: string | null) => {
      if (!assetPath) return
      if (selectedSessionPath === assetPath && loader.state.events.length > 0) {
        return
      }
      const asset = sessionAssets.find((entry) => entry.path === assetPath)
      if (!asset) {
        toast.error('Session asset unavailable', {
          description: 'The file referenced by this rule is not part of the current discovery snapshot.',
        })
        return
      }
      await onSessionOpen(asset)
    },
    [loader.state.events.length, onSessionOpen, selectedSessionPath, sessionAssets],
  )

  const handleHookGateJump = useCallback(
    async (index: number) => {
      if (hookGate?.assetPath) {
        await ensureSessionAssetLoaded(hookGate.assetPath)
      }
      setFocusEventIndex(index)
      openRuleInspector({
        activeTab: 'events',
        eventIndex: index,
        sessionId: hookGate?.sessionId,
        assetPath: hookGate?.assetPath,
      })
      void router.navigate({ to: VIEWER_INSPECTOR_ROUTE_PATH })
    },
    [ensureSessionAssetLoaded, hookGate?.assetPath, hookGate?.sessionId, openRuleInspector, router],
  )

  const contextValue: ViewerWorkspaceContextValue = {
    loaderData,
    loader,
    discovery,
    uploadController,
    activeSessionId,
    setActiveSessionId,
    sessionCoachState,
    setSessionCoachState,
    ruleSheetEntries,
    setRuleSheetEntries,
    refreshRuleInventory,
    hookGate,
    setHookGate,
    chatPrefills,
    setChatPrefill,
    handleAddTimelineEventToChat,
    handleAddSessionToChat,
    handleRemediationPrefill,
    handleFlaggedEventClick,
    handleHookGateJump,
    focusEventIndex,
    setFocusEventIndex,
    flaggedEventMarkers,
    resolveEvidenceContext,
    sessionEvents,
    misalignments,
    refreshSessionCoach,
    bindSessionToAsset,
    activeAssetPath,
    handleSessionEject,
  }

  return <ViewerWorkspaceContext.Provider value={contextValue}>{children}</ViewerWorkspaceContext.Provider>
}
