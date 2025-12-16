import { ChatDockPanel } from '~/components/chatbot/ChatDockPanel'
import { Separator } from '~/components/ui/separator'
import { useViewerWorkspace } from '../viewer.page'

export function ViewerChatView() {
  const {
    activeSessionId,
    discovery,
    sessionCoachState,
    chatPrefills,
    setChatPrefill,
    refreshSessionCoach,
    refreshRuleInventory,
  } = useViewerWorkspace()

  return (
    <div className="flex h-full flex-col gap-6">
      <section className="flex h-full flex-col min-w-0 rounded-3xl border border-white/10 bg-background/80 p-6 shadow-sm">
        <div className="mb-4 flex-none space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Session coach</p>
          <h2 className="text-2xl font-semibold text-white">Chat dock</h2>
          <p className="text-sm text-white/70">Ask clarifying questions, paste timeline snippets, and capture remediation notes.</p>
        </div>
        <Separator className="my-4 flex-none" />
        <div className="flex-1 min-h-0">
          <ChatDockPanel
            sessionId={activeSessionId}
            state={sessionCoachState}
            assets={discovery.sessionAssets}
            prefills={chatPrefills}
            onPrefillConsumed={(mode) => setChatPrefill(mode, null)}
            onRepoContextChange={async () => {
              await refreshSessionCoach(activeSessionId)
              await refreshRuleInventory()
            }}
          />
        </div>
      </section>
    </div>
  )
}
