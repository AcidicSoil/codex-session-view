import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { SessionRuleSheet } from '~/components/chatbot/SessionRuleSheet'
import { HookGateNotice } from '~/components/chatbot/HookGateNotice'
import { NeuralGlow } from '~/components/ui/neural-glow'
import type { EvidenceContext } from '~/components/chatbot/EvidenceCard'
import type { HookDecisionSeverity, HookRuleSummary } from '~/server/lib/hookifyRuntime'
import type { ResponseItemParsed } from '~/lib/session-parser'
import type { RuleInventoryEntry } from '~/lib/ruleInventoryTypes'
import { RuleInspectorSheetEventPanels } from '~/components/chatbot/RuleInspectorSheetEventPanels'
import { RuleInspectorSheetRuleAccordion } from '~/components/chatbot/RuleInspectorSheetRuleAccordion'
import { matchesSearchText } from '~/components/chatbot/ruleInspectorSheet.utils'
import { useUiSettingsStore, type RuleInspectorTab } from '~/stores/uiSettingsStore'
import { buildSearchMatchers, matchesSearchMatchers } from '~/utils/search'

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
  const selectInspectorRule = useUiSettingsStore((state) => state.selectInspectorRule)
  const selectInspectorEvent = useUiSettingsStore((state) => state.selectInspectorEvent)

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

  const [ruleSearch, setRuleSearch] = useState('')
  const ruleMatchers = useMemo(() => buildSearchMatchers(ruleSearch), [ruleSearch])
  const filteredRules = useMemo(() => {
    if (!gate?.rules?.length) return []
    if (!ruleMatchers.length && !ruleSearch.trim()) return gate.rules
    return gate.rules.filter((rule) => {
      if (matchesSearchText(rule, ruleMatchers, ruleSearch)) return true
      return rule.evidence?.some((evidence) =>
        matchesSearchMatchers(evidence.message ?? evidence.highlight ?? '', ruleMatchers),
      )
    })
  }, [gate, ruleMatchers, ruleSearch])

  const eventEvidenceMap = useMemo(() => {
    const map = new Map<number, Array<{ rule: HookRuleSummary; index: number }>>()
    gate?.rules?.forEach((rule) => {
      rule.evidence?.forEach((evidence, idx) => {
        if (typeof evidence.eventIndex !== 'number') return
        const existing = map.get(evidence.eventIndex) ?? []
        existing.push({ rule, index: idx })
        map.set(evidence.eventIndex, existing)
      })
    })
    return map
  }, [gate])

  const [selectedEventIndex, setSelectedEventIndex] = useState<number | null>(
    inspector.eventIndex ?? referencedEvents[0]?.index ?? null,
  )

  useEffect(() => {
    if (inspector.eventIndex != null) {
      setSelectedEventIndex(inspector.eventIndex)
    } else if (referencedEvents.length && selectedEventIndex == null) {
      setSelectedEventIndex(referencedEvents[0]?.index ?? null)
    }
  }, [inspector.eventIndex, referencedEvents, selectedEventIndex])

  const handleSelectEvent = (index: number) => {
    setSelectedEventIndex(index)
    selectInspectorEvent(index)
  }

  const handleSelectRule = (ruleId?: string) => {
    selectInspectorRule(ruleId)
  }

  return (
    <Sheet open={inspector.open} onOpenChange={(open) => (!open ? closeInspector() : null)}>
      <SheetContent
        side="right"
        className="w-full border-l border-white/10 bg-[#03050a]/95 text-white sm:max-w-3xl"
      >
        <SheetHeader>
          <SheetTitle className="text-left text-2xl font-semibold tracking-[0.2em] text-white">
            Rule Inspector
          </SheetTitle>
          <SheetDescription className="text-left text-xs uppercase tracking-[0.3em] text-white/60">
            Inspect gate decisions, bound rules, linked events, and repo inventory for this session.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex h-full min-h-0 flex-col">
          <Tabs value={inspector.activeTab} onValueChange={(value) => setTab(value as RuleInspectorTab)} className="flex h-full min-h-0 flex-col">
            <TabsList className="grid grid-cols-4 rounded-2xl border border-white/20 bg-[#07090f] text-xs uppercase tracking-[0.25em]">
              <TabsTrigger value="gate">Gate</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
            </TabsList>
            <div className="mt-4 flex-1 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 min-h-0">
              <TabsContent value="gate" className="h-full data-[state=inactive]:hidden">
                {gate ? (
                  <NeuralGlow className="h-full">
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
                  </NeuralGlow>
                ) : (
                  <p className="text-sm text-white/70">Open Hook Gate to review the latest decision.</p>
                )}
              </TabsContent>
              <TabsContent value="rules" className="flex h-full min-h-0 flex-col data-[state=inactive]:hidden">
                <RuleInspectorSheetRuleAccordion
                  rules={filteredRules}
                  searchValue={ruleSearch}
                  onSearchValueChange={setRuleSearch}
                  matchers={ruleMatchers}
                  onSelectRule={handleSelectRule}
                  selectedRuleId={inspector.ruleId}
                  gateSessionId={gate?.sessionId}
                  onJumpToEvent={onJumpToEvent}
                  resolveEventContext={resolveEventContext}
                />
              </TabsContent>
              <TabsContent value="events" className="flex h-full min-h-0 flex-col data-[state=inactive]:hidden">
                <RuleInspectorSheetEventPanels
                  referencedEvents={referencedEvents}
                  sessionEvents={sessionEvents}
                  selectedEventIndex={selectedEventIndex}
                  onSelectEvent={handleSelectEvent}
                  evidenceMap={eventEvidenceMap}
                  gateSessionId={gate?.sessionId}
                  onJumpToEvent={onJumpToEvent}
                  resolveEventContext={resolveEventContext}
                />
              </TabsContent>
              <TabsContent value="inventory" className="flex h-full min-h-0 flex-col data-[state=inactive]:hidden">
                <SessionRuleSheet entries={ruleSheetEntries} activeSessionId={activeSessionId} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
