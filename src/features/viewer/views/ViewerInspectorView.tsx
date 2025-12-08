import { useEffect } from 'react'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import { UploadControlsCard, UploadTimelineSection } from '../viewer.upload.section'
import { useViewerWorkspace } from '../viewer.page'
import { HookGateNotice } from '~/components/chatbot/HookGateNotice'
import { MisalignmentBanner } from '~/components/chatbot/MisalignmentBanner'

interface ViewerInspectorViewProps {
  focusPanel?: 'rules'
}

export function ViewerInspectorView({ focusPanel }: ViewerInspectorViewProps) {
  const {
    uploadController,
    handleAddTimelineEventToChat,
    flaggedEventMarkers,
    handleFlaggedEventClick,
    focusEventIndex,
    hookGate,
    setHookGate,
    misalignments,
    handleRemediationPrefill,
    resolveEvidenceContext,
    activeSessionId,
    handleHookGateJump,
  } = useViewerWorkspace()
  const openRuleInspector = useUiSettingsStore((state) => state.openRuleInspector)

  useEffect(() => {
    if (focusPanel === 'rules') {
      openRuleInspector({ activeTab: 'rules', sessionId: activeSessionId, assetPath: hookGate?.assetPath })
    }
  }, [focusPanel, openRuleInspector, activeSessionId, hookGate?.assetPath])

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
      <section className="min-w-0 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-background/80 p-6 shadow-sm">
          <UploadTimelineSection
            controller={uploadController}
            onAddTimelineEventToChat={handleAddTimelineEventToChat}
            flaggedEvents={flaggedEventMarkers}
            onFlaggedEventClick={handleFlaggedEventClick}
            focusEventIndex={focusEventIndex}
          />
        </div>
      </section>
      <aside className="min-w-0 space-y-6">
        <UploadControlsCard controller={uploadController} className="rounded-3xl border border-white/10 bg-background/80 p-5 shadow-sm" />
        {misalignments.length ? (
          <MisalignmentBanner misalignments={misalignments} onReview={handleRemediationPrefill} />
        ) : null}
        {hookGate ? (
          <HookGateNotice
            blocked={hookGate.blocked}
            severity={hookGate.severity}
            message={hookGate.message}
            annotations={hookGate.annotations}
            rules={hookGate.rules}
            sessionId={hookGate.sessionId}
            assetPath={hookGate.assetPath}
            onDismiss={() => setHookGate(null)}
            onJumpToEvent={(index) => {
              void handleHookGateJump(index)
            }}
            resolveEventContext={resolveEvidenceContext}
          />
        ) : null}
      </aside>
    </div>
  )
}
