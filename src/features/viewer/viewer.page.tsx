import { ClientOnly, Link, Outlet, useLoaderData, useRouter, useRouterState } from '@tanstack/react-router'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useFileLoader } from '~/hooks/useFileLoader'
import type { ViewerSnapshot, ViewerChatState } from './viewer.loader'
import { useViewerDiscovery, type ViewerDiscoveryState } from './viewer.discovery.section'
import { useUploadController, type UploadController } from './viewer.upload.section'
import type { TimelineEvent, TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { logInfo } from '~/lib/logger'
import type { MisalignmentRecord } from '~/lib/sessions/model'
import type { CoachPrefillPayload, ChatRemediationMetadata } from '~/lib/chatbot/types'
import { hookifyAddToChat } from '~/server/function/hookifyAddToChat'
import { fetchChatbotState } from '~/server/function/chatbotState'
import { sessionRepoContext } from '~/server/function/sessionRepoContext'
import { fetchRuleInventory } from '~/server/function/ruleInventory'
import type { HookDecisionSeverity, HookRuleSummary, HookSource } from '~/server/lib/hookifyRuntime'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import type { EvidenceContext } from '~/components/chatbot/EvidenceCard'
import type { ResponseItemParsed } from '~/lib/session-parser'
import { NeuralGlow } from '~/components/ui/neural-glow'
import { Button } from '~/components/ui/button'
import { formatCount } from '~/utils/intl'
import { cn } from '~/lib/utils'
import { RuleInspectorSheet } from '~/components/chatbot/RuleInspectorSheet'
import { pickHigherSeverity, selectPrimaryMisalignment } from '~/features/chatbot/severity'
import {
  VIEWER_CHAT_ROUTE_PATH,
  VIEWER_INSPECTOR_ROUTE_PATH,
  VIEWER_ROUTE_ID,
  VIEWER_ROUTE_PATH,
} from './route-id'

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

interface ViewerWorkspaceContextValue {
  loaderData?: ViewerSnapshot
  loader: ReturnType<typeof useFileLoader>
  discovery: ViewerDiscoveryState
  uploadController: UploadController
  activeSessionId: string
  setActiveSessionId: (id: string) => void
  sessionCoachState: ViewerChatState | null
  setSessionCoachState: (state: ViewerChatState | null) => void
  ruleSheetEntries: Awaited<ReturnType<typeof fetchRuleInventory>>
  setRuleSheetEntries: React.Dispatch<React.SetStateAction<Awaited<ReturnType<typeof fetchRuleInventory>>>>
  refreshRuleInventory: () => Promise<void>
  hookGate: HookGateState | null
  setHookGate: React.Dispatch<React.SetStateAction<HookGateState | null>>
  coachPrefill: CoachPrefillPayload | null
  setCoachPrefill: React.Dispatch<React.SetStateAction<CoachPrefillPayload | null>>
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
  bindSessionToAsset: (sessionId: string, assetPath: string) => Promise<void>
  activeAssetPath: string | null
}

const ViewerWorkspaceContext = createContext<ViewerWorkspaceContextValue | null>(null)

export function useViewerWorkspace() {
  const ctx = useContext(ViewerWorkspaceContext)
  if (!ctx) {
    throw new Error('useViewerWorkspace must be used within ViewerWorkspaceProvider')
  }
  return ctx
}

export function ViewerPage() {
  return (
    <ClientOnly fallback={<ViewerSkeleton />}>
      <ViewerWorkspaceProvider>
        <ViewerWorkspaceChrome />
      </ViewerWorkspaceProvider>
    </ClientOnly>
  )
}

function ViewerWorkspaceProvider({ children }: { children: ReactNode }) {
  const loaderData = useLoaderData({ from: VIEWER_ROUTE_ID }) as ViewerSnapshot | undefined
  const loader = useFileLoader()
  const discovery = useViewerDiscovery({ loader })
  const uploadController = useUploadController({
    loader,
    onUploadsPersisted: (assets) => discovery.appendSessionAssets(assets, 'upload'),
  })
  const router = useRouter()
  const hydrateUiSettings = useUiSettingsStore((state) => state.hydrateFromSnapshot)
  const settingsHydratedRef = useRef(false)
  const openRuleInspector = useUiSettingsStore((state) => state.openRuleInspector)
  const lastSessionPath = useUiSettingsStore((state) => state.lastSessionPath)
  const setLastSessionPath = useUiSettingsStore((state) => state.setLastSessionPath)

  if (!settingsHydratedRef.current) {
    const snapshotSource = loaderData?.uiSettings ? 'server' : 'guest'
    hydrateUiSettings(loaderData?.uiSettings ?? null, loaderData?.uiSettingsProfileId ?? null, snapshotSource)
    settingsHydratedRef.current = true
  }

  const initialSessionId = loaderData?.sessionId ?? 'demo-session'
  const [activeSessionId, setActiveSessionId] = useState(initialSessionId)
  const [sessionCoachState, setSessionCoachState] = useState<ViewerChatState | null>(loaderData?.sessionCoach ?? null)
  const [ruleSheetEntries, setRuleSheetEntries] = useState(loaderData?.ruleSheet ?? [])
  const [coachPrefill, setCoachPrefill] = useState<CoachPrefillPayload | null>(null)
  const [hookGate, setHookGate] = useState<HookGateState | null>(null)
  const [focusEventIndex, setFocusEventIndex] = useState<number | null>(null)

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
    async (sessionId: string, assetPath: string) => {
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
        await refreshSessionCoach(sessionId)
        await refreshRuleInventory()
      }
    },
    [refreshRuleInventory, refreshSessionCoach],
  )

  const selectedAsset = useMemo(() => {
    if (!discovery.selectedSessionPath) return null
    return discovery.sessionAssets.find((asset) => asset.path === discovery.selectedSessionPath) ?? null
  }, [discovery.sessionAssets, discovery.selectedSessionPath])

  const activeAssetPath = selectedAsset?.path ?? sessionCoachState?.repoContext?.assetPath ?? null

  useEffect(() => {
    if (!selectedAsset) return
    const nextSessionId = deriveSessionId(selectedAsset.path)
    if (nextSessionId === activeSessionId) return
    setActiveSessionId(nextSessionId)
    void bindSessionToAsset(nextSessionId, selectedAsset.path)
  }, [selectedAsset, activeSessionId, bindSessionToAsset])

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
        setCoachPrefill(mergedPrefill)
        void router.navigate({ to: VIEWER_CHAT_ROUTE_PATH })
      } catch (error) {
        toast.error('Hookify check failed', {
          description: error instanceof Error ? error.message : 'Unable to evaluate AGENT rules.',
        })
      }
    },
    [activeAssetPath, activeSessionId, router],
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
          bindingPromise = bindSessionToAsset(targetSessionId, asset.path)
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
    coachPrefill,
    setCoachPrefill,
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
  }

  return <ViewerWorkspaceContext.Provider value={contextValue}>{children}</ViewerWorkspaceContext.Provider>
}

function ViewerWorkspaceChrome() {
  const routerState = useRouterState({ select: (state) => state.location })
  const pathname = routerState.pathname ?? VIEWER_ROUTE_PATH
  const {
    loader,
    discovery,
    sessionCoachState,
    ruleSheetEntries,
    hookGate,
    handleHookGateJump,
    resolveEvidenceContext,
    activeSessionId,
    sessionEvents,
  } = useViewerWorkspace()

  const navItems = useMemo(
    () => [
      {
        label: 'Explorer',
        description: 'Browse cached sessions',
        href: VIEWER_ROUTE_PATH,
        metric: `${formatCount(discovery.sessionAssets.length)} assets`,
        isActive: pathname === VIEWER_ROUTE_PATH || pathname === `${VIEWER_ROUTE_PATH}/`,
      },
      {
        label: 'Inspector',
        description: 'Timeline, uploads, hook gate',
        href: VIEWER_INSPECTOR_ROUTE_PATH,
        metric: `${formatCount(loader.state.events.length)} events`,
        isActive: pathname.startsWith(VIEWER_INSPECTOR_ROUTE_PATH),
      },
      {
        label: 'Chat',
        description: 'Session coach & instructions',
        href: VIEWER_CHAT_ROUTE_PATH,
        metric: sessionCoachState?.featureEnabled ? 'Live' : 'Offline',
        isActive: pathname.startsWith(VIEWER_CHAT_ROUTE_PATH),
      },
    ],
    [discovery.sessionAssets.length, loader.state.events.length, pathname, sessionCoachState?.featureEnabled],
  )

  return (
    <NeuralGlow variant="background" className="px-4 py-10">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6">
        <nav className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/40 p-4 shadow-lg backdrop-blur-xl">
          <div className="flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href as typeof VIEWER_ROUTE_PATH | typeof VIEWER_INSPECTOR_ROUTE_PATH | typeof VIEWER_CHAT_ROUTE_PATH}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-left transition-colors duration-150',
                  item.isActive
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-white/10 text-white/70 hover:border-white/25 hover:text-white',
                )}
              >
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">{item.metric}</p>
                <p className="text-base font-semibold">{item.label}</p>
                <p className="text-xs text-white/70">{item.description}</p>
              </Link>
            ))}
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 border-white/30 text-white hover:border-white">
            <Link to={VIEWER_INSPECTOR_ROUTE_PATH} search={{ panel: 'rules' as const }}>
              Review rules
            </Link>
          </Button>
        </nav>
        <section className="flex-1">
          <Outlet />
        </section>
      </main>
      <RuleInspectorSheet
        gate={hookGate}
        ruleSheetEntries={ruleSheetEntries}
        activeSessionId={activeSessionId}
        sessionEvents={sessionEvents}
        onJumpToEvent={(index) => void handleHookGateJump(index)}
        resolveEventContext={resolveEvidenceContext}
      />
    </NeuralGlow>
  )
}

function ViewerSkeleton() {
  return (
    <NeuralGlow variant="background" className="px-4 py-10">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6">
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-96 animate-pulse rounded-3xl bg-muted" />
      </main>
    </NeuralGlow>
  )
}

function deriveSessionId(assetPath: string) {
  const trimmed = assetPath.trim()
  if (!trimmed) return 'session-unbound'
  if (typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(trimmed)
    let hex = ''
    for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, '0')
      if (hex.length >= 40) break
    }
    if (hex) {
      return `session-${hex}`
    }
  }
  const slug = trimmed.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug ? `session-${slug}` : 'session-unbound'
}

function buildFlaggedEventMap(misalignments: MisalignmentRecord[]): Map<number, TimelineFlagMarker> {
  const map = new Map<number, TimelineFlagMarker>()
  misalignments.forEach((record) => {
    if (record.status !== 'open') return
    const range = record.eventRange
    if (!range) return
    const start = typeof range.startIndex === 'number' ? range.startIndex : 0
    const end = typeof range.endIndex === 'number' ? range.endIndex : start
    for (let index = start; index <= end; index += 1) {
      const existing = map.get(index)
      if (existing) {
        map.set(index, {
          severity: pickHigherSeverity(existing.severity, record.severity),
          misalignments: [...existing.misalignments, record],
        })
      } else {
        map.set(index, { severity: record.severity, misalignments: [record] })
      }
    }
  })
  return map
}

function buildRemediationPrefill(records: MisalignmentRecord[]): CoachPrefillPayload | null {
  if (!records.length) {
    return null
  }
  const primary = selectPrimaryMisalignment(records)
  if (!primary) {
    return null
  }
  const range = primary.eventRange
    ? `events ${primary.eventRange.startIndex}-${primary.eventRange.endIndex}`
    : 'the linked events'
  const evidence = primary.evidence?.map((entry) => entry.message).filter(Boolean).join('; ')
  const supporting = records.filter((record) => record.id !== primary.id)
  const supportingLine = supporting.length
    ? `Additional rules involved: ${supporting.map((record) => `${record.ruleId} "${record.title}"`).join(', ')}.`
    : ''
  const prompt =
    [
      `Remediate AGENT rule ${primary.ruleId} "${primary.title}" (${primary.severity}).`,
      `It was flagged around ${range}.`,
      `Summary: ${primary.summary}.`,
      evidence ? `Evidence: ${evidence}.` : null,
      supportingLine || null,
      'Outline concrete steps to resolve these violations and confirm mitigations.',
    ]
      .filter(Boolean)
      .join(' ')

  return {
    prompt,
    metadata: {
      misalignmentId: primary.id,
      ruleId: primary.ruleId,
      severity: primary.severity,
      eventRange: primary.eventRange
        ? { startIndex: primary.eventRange.startIndex, endIndex: primary.eventRange.endIndex }
        : undefined,
    },
  }
}

function buildEvidenceContext(events: ResponseItemParsed[], eventIndex: number): EvidenceContext | undefined {
  if (!events.length) return undefined
  if (eventIndex < 0 || eventIndex >= events.length) return undefined
  const target = events[eventIndex]
  if (!target || target.type !== 'Message') {
    return undefined
  }
  const context: EvidenceContext = {}
  const text = normalizeMessageContent(target.content)
  if (!text) return undefined
  if (target.role === 'user') {
    context.userMessages = [text]
  } else {
    context.assistantMessages = [text]
  }
  const neighbors = [findNeighborMessage(events, eventIndex - 1, -1), findNeighborMessage(events, eventIndex + 1, 1)]
  neighbors.forEach((neighbor) => {
    if (!neighbor) return
    const neighborText = normalizeMessageContent(neighbor.content)
    if (!neighborText) return
    if (neighbor.role === 'user') {
      context.userMessages = [...(context.userMessages ?? []), neighborText]
    } else {
      context.assistantMessages = [...(context.assistantMessages ?? []), neighborText]
    }
  })
  return context
}

function findNeighborMessage(events: ResponseItemParsed[], start: number, step: number) {
  let pointer = start
  while (pointer >= 0 && pointer < events.length) {
    const candidate = events[pointer]
    if (candidate?.type === 'Message') {
      return candidate
    }
    pointer += step
  }
  return null
}

function normalizeMessageContent(content: ResponseItemParsed['content'] | string | undefined) {
  if (typeof content === 'string') {
    return content.trim()
  }
  if (Array.isArray(content)) {
    return content.map((part) => ('text' in part ? part.text : '')).join('\n').trim()
  }
  return ''
}
