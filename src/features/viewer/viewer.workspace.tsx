import { ClientOnly, useLoaderData, useRouter, useRouterState } from '@tanstack/react-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import type { ViewerSnapshot, ViewerChatState } from './viewer.loader'
import { useViewerDiscovery, type ViewerDiscoveryState } from './viewer.discovery.section'
import { useUploadController, type UploadController } from './viewer.upload.section'
import type { TimelineEvent, TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { logInfo } from '~/lib/logger'
import type { MisalignmentRecord, ChatMode } from '~/lib/sessions/model'
import type { CoachPrefillPayload, ChatRemediationMetadata } from '~/lib/chatbot/types'
import { hookifyAddToChat } from '~/server/function/hookifyAddToChat'
import { fetchChatbotState } from '~/server/function/chatbotState'
import { sessionRepoContext } from '~/server/function/sessionRepoContext'
import { fetchRuleInventory } from '~/server/function/ruleInventory'
import type { HookDecisionSeverity, HookRuleSummary, HookSource } from '~/server/lib/hookifyRuntime'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import type { EvidenceContext } from '~/components/chatbot/EvidenceCard'
import type { ResponseItemParsed } from '~/lib/session-parser'
import { useFileLoader } from '~/hooks/useFileLoader'
import {
  applyViewerSearchUpdates,
  parseViewerSearch,
  viewerSearchToCommandFilter,
  viewerSearchToRangeState,
} from './viewer.search'
import {
  buildEvidenceContext,
  buildFlaggedEventMap,
  buildRemediationPrefill,
  deriveSessionId,
} from './viewer.workspace.utils'
import { VIEWER_CHAT_ROUTE_PATH, VIEWER_INSPECTOR_ROUTE_PATH, VIEWER_ROUTE_ID } from './route-id'

interface HookGateState {
  blocked: boolean
  severity: HookDecisionSeverity
  message?: string
  annotations?: string
  rules: HookRuleSummary[]
  decisionId: string
  sessionId: string
  assetPath?: string | null
}
export type ViewerRuleSheetEntries = Awaited<ReturnType<typeof fetchRuleInventory>>

export interface ViewerWorkspaceContextValue {
  loaderData?: ViewerSnapshot
  loader: ReturnType<typeof useFileLoader>
  discovery: ViewerDiscoveryState
  uploadController: UploadController
  activeSessionId: string
  setActiveSessionId: (id: string) => void
  sessionCoachState: ViewerChatState | null
  setSessionCoachState: (state: ViewerChatState | null) => void
  ruleSheetEntries: ViewerRuleSheetEntries
  setRuleSheetEntries: React.Dispatch<React.SetStateAction<ViewerRuleSheetEntries>>
  refreshRuleInventory: () => Promise<void>
  hookGate: HookGateState | null
  setHookGate: React.Dispatch<React.SetStateAction<HookGateState | null>>
  chatPrefills: Record<ChatMode, CoachPrefillPayload | null>
  setChatPrefill: (mode: ChatMode, payload: CoachPrefillPayload | null) => void
  handleAddTimelineEventToChat: (event: TimelineEvent, index: number) => void
  handleAddSessionToChat: (asset: DiscoveredSessionAsset) => void
  handleRemediationPrefill: (records: MisalignmentRecord[]) => void
  handleFlaggedEventClick: (marker: TimelineFlagMarker) => void
  handleHookGateJump: (index: number) => Promise<void>
  focusEventIndex: number | null
  setFocusEventIndex: React.Dispatch<React.SetStateAction<number | null>>
  flaggedEventMarkers: Map<number, TimelineFlagMarker>
  resolveEvidenceContext: (eventIndex: number) => EvidenceContext | undefined
  sessionEvents: ResponseItemParsed[]
  misalignments: MisalignmentRecord[]
  refreshSessionCoach: (sessionId: string) => Promise<void>
  bindSessionToAsset: (sessionId: string, assetPath: string, options?: { refresh?: boolean }) => Promise<void>
  activeAssetPath: string | null
  handleSessionEject: () => void
}

const ViewerWorkspaceContext = createContext<ViewerWorkspaceContextValue | null>(null)

export function useViewerWorkspace() {
  const ctx = useContext(ViewerWorkspaceContext)
  if (!ctx) {
    throw new Error('useViewerWorkspace must be used within ViewerWorkspaceProvider')
  }
  return ctx
}

interface ViewerWorkspaceBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

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
  const [sessionCoachState, setSessionCoachState] = useState<ViewerChatState | null>(loaderData?.sessionCoach ?? null)
  const [ruleSheetEntries, setRuleSheetEntries] = useState(loaderData?.ruleSheet ?? [])
  const [chatPrefills, setChatPrefills] = useState<Record<ChatMode, CoachPrefillPayload | null>>({
    session: null,
    general: null,
  })
  const setChatPrefill = useCallback((mode: ChatMode, payload: CoachPrefillPayload | null) => {
    setChatPrefills((prev) => {
      if (prev[mode] === payload) {
        return prev
      }
      return { ...prev, [mode]: payload }
    })
  }, [])
  const [hookGate, setHookGate] = useState<HookGateState | null>(null)
  const [focusEventIndex, setFocusEventIndex] = useState<number | null>(null)

  const setActiveSessionId = useCallback(
    (nextSessionId: string) => {
      if (!nextSessionId || nextSessionId === activeSessionId) {
        if (nextSessionId === activeSessionId) {
          pendingSessionIdRef.current = null
        }
        return
      }
      pendingSessionIdRef.current = nextSessionId
      setSessionCoachState(null)
      setRuleSheetEntries([])
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
    if (loaderData?.sessionCoach) {
      setSessionCoachState(loaderData.sessionCoach)
    } else {
      setSessionCoachState(null)
    }
  }, [loaderData?.sessionCoach])

  useEffect(() => {
    setRuleSheetEntries(loaderData?.ruleSheet ?? [])
  }, [loaderData?.ruleSheet])

  useEffect(() => {
    setTimelineRange(viewerSearchToRangeState(viewerSearch))
    setCommandFilter(() => viewerSearchToCommandFilter(viewerSearch))
  }, [setCommandFilter, setTimelineRange, viewerSearch])

  const misalignments = sessionCoachState?.misalignments ?? []
  const sessionEvents = sessionCoachState?.snapshot?.events ?? []

  const resolveEvidenceContext = useCallback(
    (eventIndex: number) => buildEvidenceContext(sessionEvents, eventIndex),
    [sessionEvents],
  )

  const flaggedEventMarkers = useMemo(() => {
    if (!sessionCoachState?.featureEnabled) {
      return new Map<number, TimelineFlagMarker>()
    }
    return buildFlaggedEventMap(misalignments)
  }, [misalignments, sessionCoachState?.featureEnabled])

  useEffect(() => {
    if (focusEventIndex == null) return
    if (typeof window === 'undefined') return
    const timeout = window.setTimeout(() => setFocusEventIndex(null), 1200)
    return () => window.clearTimeout(timeout)
  }, [focusEventIndex])

  useEffect(() => {
    if (discovery.selectedSessionPath) {
      setLastSessionPath(discovery.selectedSessionPath)
      return
    }
    if (!discovery.selectedSessionPath && lastSessionPath) {
      discovery.setSelectedSessionPath(lastSessionPath)
    }
  }, [discovery, lastSessionPath, setLastSessionPath])

  const refreshSessionCoach = useCallback(async (sessionId: string) => {
    try {
      const next = await fetchChatbotState({ data: { sessionId, mode: 'session' } })
      setSessionCoachState(next)
    } catch (error) {
      toast.error('Failed to refresh Session Coach', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [])

  const refreshRuleInventory = useCallback(async () => {
    try {
      const inventory = await fetchRuleInventory({ data: {} })
      setRuleSheetEntries(inventory)
    } catch (error) {
      toast.error('Failed to refresh rule sheet', {
        description: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }, [])

  const bindSessionToAsset = useCallback(
    async (sessionId: string, assetPath: string, options?: { refresh?: boolean }) => {
      try {
        await sessionRepoContext({
          data: {
            action: 'set',
            sessionId,
            assetPath,
          },
        })
      } catch (error) {
        toast.error('Failed to bind repo instructions', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        if (options?.refresh === false) {
          return
        }
        await refreshSessionCoach(sessionId)
        await refreshRuleInventory()
      }
    },
    [refreshRuleInventory, refreshSessionCoach],
  )

  const sessionIdToAssetPath = useMemo(() => {
    const map = new Map<string, string>()
    for (const asset of discovery.sessionAssets) {
      map.set(deriveSessionId(asset.path), asset.path)
    }
    return map
  }, [discovery.sessionAssets])

  const selectedAsset = useMemo(() => {
    if (!discovery.selectedSessionPath) return null
    return discovery.sessionAssets.find((asset) => asset.path === discovery.selectedSessionPath) ?? null
  }, [discovery.sessionAssets, discovery.selectedSessionPath])

  useEffect(() => {
    if (pendingSessionIdRef.current && pendingSessionIdRef.current !== activeSessionId) {
      return
    }
    const selectedId = discovery.selectedSessionPath ? deriveSessionId(discovery.selectedSessionPath) : null
    if (selectedId === activeSessionId) {
      return
    }
    const matchingPath = sessionIdToAssetPath.get(activeSessionId) ?? null
    if (matchingPath && discovery.selectedSessionPath !== matchingPath) {
      discovery.setSelectedSessionPath(matchingPath)
      return
    }
    if (!matchingPath && discovery.selectedSessionPath) {
      discovery.setSelectedSessionPath(null)
    }
  }, [activeSessionId, discovery.selectedSessionPath, discovery.setSelectedSessionPath, sessionIdToAssetPath])

  const activeAssetPath = selectedAsset?.path ?? sessionCoachState?.repoContext?.assetPath ?? null

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

  const runHookifyPrefill = useCallback(
    async (
      basePrompt: string,
      source: HookSource,
      extras?: { eventType?: string; filePath?: string },
      metadataOverride?: ChatRemediationMetadata,
    ) => {
      setHookGate(null)
      try {
        const response = await hookifyAddToChat({
          data: {
            sessionId: activeSessionId,
            source,
            content: basePrompt,
            eventType: extras?.eventType,
            filePath: extras?.filePath,
          },
        })
        setHookGate({
          blocked: response.blocked,
          severity: response.severity,
          message: response.message,
          annotations: response.annotations,
          rules: response.rules,
          decisionId: response.decisionId,
          sessionId: activeSessionId,
          assetPath: extras?.filePath ?? activeAssetPath ?? null,
        })
        if (response.blocked || !response.prefill) {
          toast.error('Add to chat blocked', {
            description: response.message ?? 'Resolve AGENT violations before continuing.',
          })
          return
        }
        const mergedPrefill: CoachPrefillPayload = {
          prompt: response.prefill.prompt,
          metadata: metadataOverride ?? response.prefill.metadata,
        }
        setChatPrefill('session', mergedPrefill)
        setChatPrefill('general', mergedPrefill)
        void router.navigate({ to: VIEWER_CHAT_ROUTE_PATH })
      } catch (error) {
        toast.error('Hookify check failed', {
          description: error instanceof Error ? error.message : 'Unable to evaluate AGENT rules.',
        })
      }
    },
    [activeAssetPath, activeSessionId, router, setChatPrefill],
  )

  const handleAddTimelineEventToChat = useCallback(
    (event: TimelineEvent, index: number) => {
      logInfo('viewer.chatdock', 'Timeline event add-to-chat requested', {
        eventType: event.type,
        index,
      })

      const snippet = JSON.stringify(event, null, 2)
      const prompt = `Analyze this timeline event #${index + 1} (${event.type}):\n\n\`\`\`json\n${snippet}\n\`\`\`\n\nWhat are the implications of this event?`

      void runHookifyPrefill(prompt, 'timeline', {
        eventType: event.type,
        filePath: activeAssetPath ?? undefined,
      })
    },
    [activeAssetPath, runHookifyPrefill],
  )

  const handleAddSessionToChat = useCallback(
    (asset: DiscoveredSessionAsset) => {
      void (async () => {
        const targetSessionId = deriveSessionId(asset.path)
        let bindingPromise: Promise<void> | null = null
        if (targetSessionId !== activeSessionId) {
          setActiveSessionId(targetSessionId)
          discovery.setSelectedSessionPath(asset.path)
          bindingPromise = bindSessionToAsset(targetSessionId, asset.path, { refresh: false })
        }

        if (bindingPromise) {
          await bindingPromise
        }

        logInfo('viewer.chatdock', 'Session add-to-chat requested', {
          path: asset.path,
          repo: asset.repoLabel ?? asset.repoName,
        })

        const prompt = `I am looking at session file: ${asset.path}\nRepo: ${asset.repoLabel ?? asset.repoName ?? 'unknown'}\n\nPlease analyze this session context.`

        await runHookifyPrefill(prompt, 'session', { filePath: asset.path })
      })()
    },
    [activeSessionId, bindSessionToAsset, discovery, runHookifyPrefill],
  )

  const handleRemediationPrefill = useCallback(
    (records: MisalignmentRecord[]) => {
      const payload = buildRemediationPrefill(records)
      if (!payload) return
      void runHookifyPrefill(
        payload.prompt,
        'manual',
        { filePath: activeAssetPath ?? undefined },
        payload.metadata,
      )
    },
    [runHookifyPrefill, activeAssetPath],
  )

  const handleFlaggedEventClick = useCallback(
    (marker: TimelineFlagMarker) => {
      handleRemediationPrefill(marker.misalignments)
    },
    [handleRemediationPrefill],
  )

  const uploadController = useUploadController({
    loader,
    onUploadsPersisted: useCallback(
      (assets: DiscoveredSessionAsset[]) => {
        discovery.appendSessionAssets(assets, 'upload')
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
          discovery.setSelectedSessionPath(newest.path)
          logInfo('viewer.explorer', 'Auto-selected newly persisted session', { path: newest.path })
        }
      },
      [discovery],
    ),
  })

  const handleSessionEject = useCallback(() => {
    if (uploadController.isEjecting) return
    uploadController.ejectSession()
    discovery.stopLiveWatcher()
    discovery.setSelectedSessionPath(null)
    setLastSessionPath(null)
    setSessionCoachState(null)
    setRuleSheetEntries([])
    setActiveSessionId('session-default')
    setFocusEventIndex(null)
  }, [
    discovery,
    setRuleSheetEntries,
    setSessionCoachState,
    setActiveSessionId,
    setFocusEventIndex,
    setLastSessionPath,
    uploadController,
  ])

  const ensureSessionAssetLoaded = useCallback(
    async (assetPath?: string | null) => {
      if (!assetPath) return
      if (discovery.selectedSessionPath === assetPath && loader.state.events.length > 0) {
        return
      }
      const asset = discovery.sessionAssets.find((entry) => entry.path === assetPath)
      if (!asset) {
        toast.error('Session asset unavailable', {
          description: 'The file referenced by this rule is not part of the current discovery snapshot.',
        })
        return
      }
      await discovery.onSessionOpen(asset)
    },
    [discovery, loader.state.events.length],
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
