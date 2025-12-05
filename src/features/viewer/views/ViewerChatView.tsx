import { SessionRepoSelector } from '~/components/chatbot/SessionRepoSelector'
import { SessionRuleSheet } from '~/components/chatbot/SessionRuleSheet'
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
    ruleSheetEntries,
  } = useViewerWorkspace()

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(320px,420px)]">
      <section className="rounded-3xl border border-white/10 bg-background/80 p-6 shadow-sm">
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
      <aside className="space-y-6">
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
        <section className="rounded-3xl border border-white/10 bg-background/80 p-5 shadow-sm">
          <SessionRuleSheet entries={ruleSheetEntries} activeSessionId={activeSessionId} />
        </section>
      </aside>
    </div>
  )
}
