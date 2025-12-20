import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import type { TimelineEvent, TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
import type { EvidenceContext } from '~/components/chatbot/EvidenceCard'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import type { ChatMode, MisalignmentRecord } from '~/lib/sessions/model'
import type { CoachPrefillPayload } from '~/lib/chatbot/types'
import type { ResponseItemParsed } from '~/lib/session-parser'
import type { HookDecisionSeverity, HookRuleSummary } from '~/server/lib/hookifyRuntime'
import type { ViewerChatState, ViewerSnapshot } from './viewer.loader'
import type { ViewerDiscoveryState } from './viewer.discovery.section'
import type { UploadController } from './viewer.upload.section'
import type { fetchRuleInventory } from '~/server/function/ruleInventory'
import { useFileLoader } from '~/hooks/useFileLoader'

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
  setRuleSheetEntries: Dispatch<SetStateAction<ViewerRuleSheetEntries>>
  refreshRuleInventory: () => Promise<void>
  hookGate: HookGateState | null
  setHookGate: Dispatch<SetStateAction<HookGateState | null>>
  chatPrefills: Record<ChatMode, CoachPrefillPayload | null>
  setChatPrefill: (mode: ChatMode, payload: CoachPrefillPayload | null) => void
  handleAddTimelineEventToChat: (event: TimelineEvent, index: number) => void
  handleAddSessionToChat: (asset: DiscoveredSessionAsset) => void
  handleRemediationPrefill: (records: MisalignmentRecord[]) => void
  handleFlaggedEventClick: (marker: TimelineFlagMarker) => void
  handleHookGateJump: (index: number) => Promise<void>
  focusEventIndex: number | null
  setFocusEventIndex: Dispatch<SetStateAction<number | null>>
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

export function useOptionalViewerWorkspace() {
  return useContext(ViewerWorkspaceContext)
}

export interface ViewerWorkspaceBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export { ViewerWorkspaceContext }
export type { HookGateState }
