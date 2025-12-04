import { useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import type { RuleInventoryEntry } from '~/server/lib/ruleInventory'
import { SessionRuleSheet } from '~/components/chatbot/SessionRuleSheet'
import { HookGateNotice } from '~/components/chatbot/HookGateNotice'
import type { HookDecisionSeverity, HookRuleSummary } from '~/server/lib/hookifyRuntime'
import { useUiSettingsStore, type RuleInspectorTab } from '~/stores/uiSettingsStore'
import type { EvidenceContext } from '~/components/chatbot/EvidenceCard'
import { EvidenceCard } from '~/components/chatbot/EvidenceCard'
import type { ResponseItemParsed } from '~/lib/session-parser'

interface RuleInspectorSheetProps {
  gate: RuleInspectorGate | null
  ruleSheetEntries: RuleInventoryEntry[]
  activeSessionId: string
  sessionEvents: ResponseItemParsed[]
  onJumpToEvent: (eventIndex: number) => void | Promise<void>
  resolveEventContext: (eventIndex: number) => EvidenceContext | undefined
}

export interface RuleInspectorGate {
  blocked: boolean
  severity: HookDecisionSeverity
  message?: string
  annotations?: string
  rules: HookRuleSummary[]
  sessionId?: string
  assetPath?: string | null
}

export function RuleInspectorSheet({
  gate,
  ruleSheetEntries,
  activeSessionId,
  sessionEvents,
  onJumpToEvent,
  resolveEventContext,
}: RuleInspectorSheetProps) {
  const inspector = useUiSettingsStore((state) => state.ruleInspector)
  const closeInspector = useUiSettingsStore((state) => state.closeRuleInspector)
  const setTab = useUiSettingsStore((state) => state.setRuleInspectorTab)

  const referencedEventIndexes = useMemo(() => {
    if (!gate?.rules) return []
    const set = new Set<number>()
    gate.rules.forEach((rule) => {
      rule.evidence?.forEach((evidence) => {
        if (typeof evidence.eventIndex === 'number') {
          set.add(evidence.eventIndex)
        }
      })
    })
    return Array.from(set).sort((a, b) => a - b)
  }, [gate])

  const referencedEvents = useMemo(() => {
    return referencedEventIndexes
      .map((index) => ({ event: sessionEvents[index], index }))
      .filter((record) => Boolean(record.event))
  }, [referencedEventIndexes, sessionEvents])

  const renderRulesPanel = () => {
    if (!gate?.rules?.length) {
      return <p className="text-sm text-white/70">No rules to review yet.</p>
    }
    return (
      <div className="space-y-4">
        {gate.rules.map((rule) => (
          <div key={rule.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">{rule.id}</p>
                <p className="text-lg font-semibold text-white">{rule.title}</p>
              </div>
              <span className="text-sm uppercase tracking-[0.3em] text-white/80">{rule.severity}</span>
            </div>
            <p className="mt-2 text-sm text-white/80">{rule.summary}</p>
            {rule.evidence?.length ? (
              <div className="mt-3 space-y-3">
                {rule.evidence.map((evidence, index) => (
                  <EvidenceCard
                    key={`${rule.id}-rulesheet-${index}`}
                    index={index}
                    ruleId={rule.id}
                    evidence={evidence}
                    sessionId={gate.sessionId}
                    onJumpToEvent={onJumpToEvent}
                    context={
                      typeof evidence.eventIndex === 'number'
                        ? resolveEventContext(evidence.eventIndex)
                        : undefined
                    }
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  const renderEventsPanel = () => {
    if (!referencedEvents.length) {
      return <p className="text-sm text-white/70">No specific events were linked to this gate.</p>
    }
    return (
      <div className="space-y-3">
        {referencedEvents.map(({ event, index }) => (
          <div
            key={`event-${index}`}
            className="space-y-2 rounded-2xl border border-white/10 bg-gradient-to-br from-black/70 to-black/30 p-4"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
              <span>Event #{index + 1}</span>
              <span>{event?.type}</span>
            </div>
            <p className="text-sm text-white/90">{formatEventPreview(event)}</p>
            <button
              type="button"
              className="text-xs uppercase tracking-[0.3em] text-lime-300 transition hover:text-lime-200"
              onClick={() => {
                void onJumpToEvent(index)
              }}
            >
              Jump to event
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <Sheet open={inspector.open} onOpenChange={(open) => (!open ? closeInspector() : null)}>
      <SheetContent side="right" className="w-full border-l border-white/10 bg-black/90 text-white sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="text-left text-2xl font-semibold tracking-[0.2em] text-white">
            Rule Inspector
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex h-full flex-col">
          <Tabs value={inspector.activeTab} onValueChange={(value) => setTab(value as RuleInspectorTab)} className="flex h-full flex-col">
            <TabsList className="grid grid-cols-4 rounded-2xl border border-white/20 bg-black/40 text-xs uppercase tracking-[0.25em]">
              <TabsTrigger value="gate">Gate</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>
            <div className="mt-4 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-black/40 p-4">
              <TabsContent value="gate" className="h-full data-[state=inactive]:hidden">
                {gate ? (
                  <HookGateNotice
                    blocked={gate.blocked}
                    severity={gate.severity}
                    message={gate.message}
                    annotations={gate.annotations}
                    rules={gate.rules}
                    sessionId={gate.sessionId}
                    assetPath={gate.assetPath}
                    resolveEventContext={resolveEventContext}
                  />
                ) : (
                  <p className="text-sm text-white/70">Open Hook Gate to review the latest decision.</p>
                )}
              </TabsContent>
              <TabsContent value="rules" className="h-full data-[state=inactive]:hidden">
                {renderRulesPanel()}
              </TabsContent>
              <TabsContent value="events" className="h-full data-[state=inactive]:hidden">
                {renderEventsPanel()}
              </TabsContent>
              <TabsContent value="inventory" className="h-full data-[state=inactive]:hidden">
                <SessionRuleSheet entries={ruleSheetEntries} activeSessionId={activeSessionId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function formatEventPreview(event?: ResponseItemParsed) {
  if (!event) return 'Event data not available.'
  if (event.type === 'Message') {
    const content = Array.isArray(event.content)
      ? event.content.map((part) => part.text).join('\n')
      : event.content
    return `${event.role}: ${content.slice(0, 280)}${content.length > 280 ? '…' : ''}`
  }
  if ('command' in event && typeof event.command === 'string') {
    return `${event.type}: ${event.command}`
  }
  if ('path' in event && typeof event.path === 'string') {
    return `${event.type}: ${event.path}`
  }
  return `${event.type} event`
}
