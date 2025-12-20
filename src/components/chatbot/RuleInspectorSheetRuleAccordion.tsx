import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion'
import { Badge } from '~/components/ui/badge'
import { HighlightedText } from '~/components/ui/highlighted-text'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { EvidenceCard, type EvidenceContext } from '~/components/chatbot/EvidenceCard'
import type { HookRuleSummary } from '~/server/lib/hookifyRuntime'
import type { SearchMatcher } from '~/utils/search'
import { cn } from '~/lib/utils'

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

export function RuleInspectorSheetRuleAccordion({
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
