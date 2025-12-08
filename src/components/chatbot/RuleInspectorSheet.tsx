import { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '~/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import type { RuleInventoryEntry } from '~/lib/ruleInventoryTypes'
import { SessionRuleSheet } from '~/components/chatbot/SessionRuleSheet'
import { HookGateNotice } from '~/components/chatbot/HookGateNotice'
import type { HookDecisionSeverity, HookRuleSummary } from '~/server/lib/hookifyRuntime'
import { useUiSettingsStore, type RuleInspectorTab } from '~/stores/uiSettingsStore'
import type { EvidenceContext } from '~/components/chatbot/EvidenceCard'
import { EvidenceCard } from '~/components/chatbot/EvidenceCard'
import type { ResponseItemParsed } from '~/lib/session-parser'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Badge } from '~/components/ui/badge'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion'
import { HighlightedText } from '~/components/ui/highlighted-text'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable'
import { NeuralGlow } from '~/components/ui/neural-glow'
import { buildSearchMatchers, matchesSearchMatchers, type SearchMatcher } from '~/utils/search'
import { cn } from '~/lib/utils'

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
                <RuleAccordionList
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
                <EventInspectorPanels
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

function matchesSearchText(rule: HookRuleSummary, matchers: SearchMatcher[], raw: string) {
  if (!raw.trim()) return true
  const haystack = `${rule.id} ${rule.title} ${rule.summary}`
  return matchesSearchMatchers(haystack, matchers)
}

interface RuleAccordionListProps {
  rules: HookRuleSummary[]
  searchValue: string
  onSearchValueChange: (value: string) => void
  matchers: SearchMatcher[]
  selectedRuleId?: string
  onSelectRule: (ruleId?: string) => void
  gateSessionId?: string
  onJumpToEvent: (eventIndex: number) => void | Promise<void>
  resolveEventContext: (eventIndex: number) => EvidenceContext | undefined
}

function RuleAccordionList({
  rules,
  searchValue,
  onSearchValueChange,
  matchers,
  selectedRuleId,
  onSelectRule,
  gateSessionId,
  onJumpToEvent,
  resolveEventContext,
}: RuleAccordionListProps) {
  if (!rules.length) {
    return <p className="text-sm text-white/70">No rules to review yet.</p>
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <Input
        value={searchValue}
        onChange={(event) => onSearchValueChange(event.target.value)}
        placeholder="Search rules, summaries, or evidence"
        className="border-white/20 bg-black/60 text-sm text-white placeholder:text-white/40"
      />
      <ScrollArea className="flex-1">
        <Accordion type="multiple" className="space-y-3">
          {rules.map((rule) => (
            <AccordionItem
              key={rule.id}
              value={rule.id}
              className={cn(
                'overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4',
                selectedRuleId === rule.id && 'border-lime-400/70 bg-black/40',
              )}
            >
              <AccordionTrigger onClick={() => onSelectRule(rule.id)} className="text-left">
                <div className="flex w-full flex-col gap-1 text-left">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/60">
                    <span>
                      Rule <HighlightedText text={rule.id} matchers={matchers} />
                    </span>
                    <Badge variant="outline" className="border-none bg-white/10 text-[0.65rem] uppercase tracking-[0.3em] text-white">
                      {rule.severity}
                    </Badge>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    <HighlightedText text={rule.title} matchers={matchers} />
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-white/80">
                  <HighlightedText text={rule.summary} matchers={matchers} as="p" />
                  {rule.eventRange ? (
                    <p className="text-xs uppercase tracking-[0.25em] text-white/50">
                      Events {rule.eventRange.startIndex}–{rule.eventRange.endIndex}
                    </p>
                  ) : null}
                  {rule.evidence?.length ? (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-3">
                      {rule.evidence.map((evidence, index) => (
                        <EvidenceCard
                          key={`${rule.id}-rulesheet-${index}`}
                          index={index}
                          ruleId={rule.id}
                          evidence={evidence}
                          sessionId={gateSessionId}
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollArea>
    </div>
  )
}

interface EventInspectorPanelsProps {
  referencedEvents: { event?: ResponseItemParsed; index: number }[]
  sessionEvents: ResponseItemParsed[]
  selectedEventIndex: number | null
  onSelectEvent: (index: number) => void
  evidenceMap: Map<number, Array<{ rule: HookRuleSummary; index: number }>>
  gateSessionId?: string
  onJumpToEvent: (eventIndex: number) => void | Promise<void>
  resolveEventContext: (eventIndex: number) => EvidenceContext | undefined
}

function EventInspectorPanels({
  referencedEvents,
  sessionEvents,
  selectedEventIndex,
  onSelectEvent,
  evidenceMap,
  gateSessionId,
  onJumpToEvent,
  resolveEventContext,
}: EventInspectorPanelsProps) {
  if (!referencedEvents.length) {
    return <p className="text-sm text-white/70">No specific events were linked to this gate.</p>
  }

  const selectedEvent = selectedEventIndex != null ? sessionEvents[selectedEventIndex] : undefined
  const selectedEvidence = selectedEventIndex != null ? evidenceMap.get(selectedEventIndex) ?? [] : []

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full rounded-2xl">
      <ResizablePanel defaultSize={25} minSize={18} className="rounded-2xl border border-white/10 bg-black/40">
        <ScrollArea className="h-full p-3">
          <div className="space-y-2">
            {referencedEvents.map(({ event, index }) => (
              <button
                key={`event-${index}`}
                type="button"
                onClick={() => onSelectEvent(index)}
                className={cn(
                  'w-full rounded-2xl border border-white/10 bg-gradient-to-br from-[#0b0f18] to-[#05070c] p-3 text-left text-xs uppercase tracking-[0.2em] text-white/60 transition hover:border-white/40',
                  selectedEventIndex === index && 'border-lime-400/60 text-white',
                )}
              >
                <div className="flex items-center justify-between">
                  <span>Event #{index + 1}</span>
                  <span>{event?.type}</span>
                </div>
                <p className="mt-2 text-[0.7rem] normal-case tracking-normal text-white/80">
                  {formatEventPreview(event)}
                </p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={45} minSize={30} className="rounded-2xl border border-white/10 bg-black/30">
        <ScrollArea className="h-full p-4">
          {selectedEvent ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                <span>{selectedEvent.type}</span>
                <span>#{selectedEventIndex! + 1}</span>
              </div>
              <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-black/60 p-4 text-sm text-white/80">
                {formatEventDetail(selectedEvent)}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-white/70">Select an event to inspect the captured payload.</p>
          )}
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle />
      <ResizablePanel defaultSize={30} minSize={20} className="rounded-2xl border border-white/10 bg-black/30">
        <ScrollArea className="h-full p-4">
          {selectedEventIndex == null || !selectedEvidence.length ? (
            <p className="text-sm text-white/70">No evidence linked to this event.</p>
          ) : (
            <div className="space-y-3">
              {selectedEvidence.map(({ rule, index }) => {
                const entry = rule.evidence?.[index]
                if (!entry) return null
                const eventIndex = typeof entry.eventIndex === 'number' ? entry.eventIndex : undefined
                return (
                  <EvidenceCard
                    key={`${rule.id}-event-panel-${index}`}
                    index={index}
                    ruleId={rule.id}
                    evidence={entry}
                    sessionId={gateSessionId}
                    onJumpToEvent={onJumpToEvent}
                    context={eventIndex != null ? resolveEventContext(eventIndex) : undefined}
                  />
                )
              })}
            </div>
          )}
        </ScrollArea>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

function formatEventPreview(event?: ResponseItemParsed) {
  if (!event) return 'Event data not available.'
  if (event.type === 'Message') {
    const content = Array.isArray(event.content)
      ? event.content.map((part) => ('text' in part ? part.text : '')).join('\n')
      : event.content
    const prefix = event.role ? `${event.role}: ` : ''
    return `${prefix}${content.slice(0, 160)}${content.length > 160 ? '…' : ''}`
  }
  if ('command' in event && typeof event.command === 'string') {
    return `${event.type}: ${event.command}`
  }
  if ('path' in event && typeof event.path === 'string') {
    return `${event.type}: ${event.path}`
  }
  return `${event.type} event`
}

function formatEventDetail(event: ResponseItemParsed) {
  if (event.type === 'Message') {
    const content = Array.isArray(event.content)
      ? event.content.map((part) => ('text' in part ? part.text : '')).join('\n')
      : event.content
    return `${event.role ?? 'assistant'}\n${content}`
  }
  return JSON.stringify(event, null, 2)
}
