import { useEffect } from 'react'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import { UploadTimelineSection } from '../viewer.upload.section'
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

  const hasInspectorRail = misalignments.length > 0 || Boolean(hookGate)

  return (
    <div className="flex flex-col gap-8 xl:flex-row">
      <section className="min-w-0 flex-1 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-background/80 p-6 shadow-sm">
          <UploadTimelineSection
            controller={uploadController}
            onAddTimelineEventToChat={handleAddTimelineEventToChat}
            flaggedEvents={flaggedEventMarkers}
            onFlaggedEventClick={handleFlaggedEventClick}
            focusEventIndex={focusEventIndex}
            className="w-full"
          />
        </div>
      </section>
      {hasInspectorRail ? (
        <aside className="xl:w-[360px] xl:flex-none xl:space-y-6 xl:self-start xl:rounded-3xl xl:border xl:border-white/10 xl:bg-background/80 xl:p-6 xl:shadow-sm xl:sticky xl:top-28">
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
      ) : null}
    </div>
  )
}
