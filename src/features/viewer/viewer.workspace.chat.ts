import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { toast } from 'sonner'
import type { TimelineEvent, TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { logInfo } from '~/lib/logger'
import type { MisalignmentRecord, ChatMode } from '~/lib/sessions/model'
import type { CoachPrefillPayload, ChatRemediationMetadata } from '~/lib/chatbot/types'
import { hookifyAddToChat } from '~/server/function/hookifyAddToChat'
import { fetchChatbotState } from '~/server/function/chatbotState'
import { fetchRuleInventory } from '~/server/function/ruleInventory'
import { sessionRepoContext } from '~/server/function/sessionRepoContext'
import type { HookGateState, ViewerRuleSheetEntries } from './viewer.workspace.context'
import type { ViewerChatState, ViewerSnapshot } from './viewer.loader'
import type { EvidenceContext } from '~/components/chatbot/EvidenceCard'
import type { ResponseItemParsed } from '~/lib/session-parser'
import type { HookSource } from '~/server/lib/hookifyRuntime'
import {
  buildEvidenceContext,
  buildFlaggedEventMap,
  buildRemediationPrefill,
  deriveSessionId,
} from './viewer.workspace.utils'
import { VIEWER_CHAT_ROUTE_PATH } from './route-id'

interface UseViewerWorkspaceChatOptions {
  loaderData?: ViewerSnapshot
  activeSessionId: string
  selectedAssetPath: string | null
  setActiveSessionId: (id: string) => void
  setSelectedSessionPath: (path: string | null) => void
  router: { navigate: (options: { to: string }) => void | Promise<void> }
}

interface UseViewerWorkspaceChatResult {
  sessionCoachState: ViewerChatState | null
  setSessionCoachState: Dispatch<SetStateAction<ViewerChatState | null>>
  ruleSheetEntries: ViewerRuleSheetEntries
  setRuleSheetEntries: Dispatch<SetStateAction<ViewerRuleSheetEntries>>
  refreshRuleInventory: () => Promise<void>
  chatPrefills: Record<ChatMode, CoachPrefillPayload | null>
  setChatPrefill: (mode: ChatMode, payload: CoachPrefillPayload | null) => void
  hookGate: HookGateState | null
  setHookGate: Dispatch<SetStateAction<HookGateState | null>>
  handleAddTimelineEventToChat: (event: TimelineEvent, index: number) => void
  handleAddSessionToChat: (asset: DiscoveredSessionAsset) => void
  handleRemediationPrefill: (records: MisalignmentRecord[]) => void
  handleFlaggedEventClick: (marker: TimelineFlagMarker) => void
  focusEventIndex: number | null
  setFocusEventIndex: Dispatch<SetStateAction<number | null>>
  activeAssetPath: string | null
  flaggedEventMarkers: Map<number, TimelineFlagMarker>
  resolveEvidenceContext: (eventIndex: number) => EvidenceContext | undefined
  sessionEvents: ResponseItemParsed[]
  misalignments: MisalignmentRecord[]
  refreshSessionCoach: (sessionId: string) => Promise<void>
  bindSessionToAsset: (sessionId: string, assetPath: string, options?: { refresh?: boolean }) => Promise<void>
}

export function useViewerWorkspaceChat({
  loaderData,
  activeSessionId,
  selectedAssetPath,
  setActiveSessionId,
  setSelectedSessionPath,
  router,
}: UseViewerWorkspaceChatOptions): UseViewerWorkspaceChatResult {
  const [sessionCoachState, setSessionCoachState] = useState<ViewerChatState | null>(loaderData?.sessionCoach ?? null)
  const [ruleSheetEntries, setRuleSheetEntries] = useState<ViewerRuleSheetEntries>(loaderData?.ruleSheet ?? [])
  const [chatPrefills, setChatPrefills] = useState<Record<ChatMode, CoachPrefillPayload | null>>({
    session: null,
    general: null,
  })
  const previousSessionIdRef = useRef(activeSessionId)
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

  useEffect(() => {
    if (loaderData?.sessionCoach) {
      setSessionCoachState(loaderData.sessionCoach)
    } else {
      setSessionCoachState(null)
    }
  }, [loaderData?.sessionCoach])

  useEffect(() => {
    if (previousSessionIdRef.current === activeSessionId) {
      return
    }
    previousSessionIdRef.current = activeSessionId
    setSessionCoachState(null)
    setRuleSheetEntries([])
  }, [activeSessionId])

  useEffect(() => {
    setRuleSheetEntries(loaderData?.ruleSheet ?? [])
  }, [loaderData?.ruleSheet])

  const misalignments = sessionCoachState?.misalignments ?? []
  const sessionEvents = sessionCoachState?.snapshot?.events ?? []
  const activeAssetPath = selectedAssetPath ?? sessionCoachState?.repoContext?.assetPath ?? null

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
      const shouldRefresh = options?.refresh !== false
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
        if (shouldRefresh) {
          await refreshSessionCoach(sessionId)
          await refreshRuleInventory()
        }
      }
    },
    [refreshRuleInventory, refreshSessionCoach],
  )

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
      const resolvedEventIndex = typeof event.index === 'number' ? event.index : index
      const metadata: ChatRemediationMetadata = {
        eventRange: { startIndex: resolvedEventIndex, endIndex: resolvedEventIndex },
      }

      void runHookifyPrefill(
        prompt,
        'timeline',
        {
          eventType: event.type,
          filePath: activeAssetPath ?? undefined,
        },
        metadata,
      )
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
          setSelectedSessionPath(asset.path)
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
    [activeSessionId, bindSessionToAsset, runHookifyPrefill, setActiveSessionId, setSelectedSessionPath],
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

  return {
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
    activeAssetPath,
    flaggedEventMarkers,
    resolveEvidenceContext,
    sessionEvents,
    misalignments,
    refreshSessionCoach,
    bindSessionToAsset,
  }
}
