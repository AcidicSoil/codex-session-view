import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '~/components/ui/resizable'
import { ScrollArea } from '~/components/ui/scroll-area'
import { EvidenceCard, type EvidenceContext } from '~/components/chatbot/EvidenceCard'
import type { HookRuleSummary } from '~/server/lib/hookifyRuntime'
import type { ResponseItemParsed } from '~/lib/session-parser'
import { cn } from '~/lib/utils'
import { formatEventDetail, formatEventPreview } from '~/components/chatbot/ruleInspectorSheet.utils'

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

export function RuleInspectorSheetEventPanels({
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
