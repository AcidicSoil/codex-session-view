import { SessionRepoSelector } from '~/components/chatbot/SessionRepoSelector'
import { ChatDockPanel } from '~/components/chatbot/ChatDockPanel'
import { Separator } from '~/components/ui/separator'
import { useViewerWorkspace } from '../viewer.page'

export function ViewerChatView() {
  const {
    activeSessionId,
    discovery,
    sessionCoachState,
    coachPrefill,
    setCoachPrefill,
    refreshSessionCoach,
    refreshRuleInventory,
  } = useViewerWorkspace()

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,1fr)]">
      <section className="min-w-0 rounded-3xl border border-white/10 bg-background/80 p-6 shadow-sm">
        <div className="mb-4 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Session coach</p>
          <h2 className="text-2xl font-semibold text-white">Chat dock</h2>
          <p className="text-sm text-white/70">Ask clarifying questions, paste timeline snippets, and capture remediation notes.</p>
        </div>
        <Separator className="my-4" />
        <ChatDockPanel
          sessionId={activeSessionId}
          state={sessionCoachState}
          prefill={coachPrefill}
          onPrefillConsumed={() => setCoachPrefill(null)}
        />
      </section>
      <aside className="min-w-0 space-y-6">
        <section className="rounded-3xl border border-white/10 bg-background/80 p-5 shadow-sm">
          <SessionRepoSelector
            sessionId={activeSessionId}
            assets={discovery.sessionAssets}
            repoContext={sessionCoachState?.repoContext}
            onRepoContextChange={async () => {
              await refreshSessionCoach(activeSessionId)
              await refreshRuleInventory()
            }}
          />
        </section>
      </aside>
    </div>
  )
}
