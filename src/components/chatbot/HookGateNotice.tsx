import { useMemo, useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import type { HookDecisionSeverity, HookRuleSummary } from '~/server/lib/hookifyRuntime'
import { cn } from '~/lib/utils'
import { FormattedContent } from '~/components/ui/formatted-content'
import { BookmarkToggle } from '~/components/chatbot/BookmarkToggle'
import { EvidenceCard, type EvidenceContext } from '~/components/chatbot/EvidenceCard'

interface HookGateNoticeProps {
  blocked: boolean
  severity: HookDecisionSeverity
  message?: string
  rules: HookRuleSummary[]
  annotations?: string
  sessionId?: string
  assetPath?: string | null
  onDismiss?: () => void
  onReviewRules?: (primaryRuleId?: string) => void
  onJumpToEvent?: (eventIndex: number) => void | Promise<void>
  resolveEventContext?: (eventIndex: number) => EvidenceContext | undefined
}

const severityAccent: Record<HookDecisionSeverity, string> = {
  critical: 'from-[#ff0059]/70 to-[#41001f]/80 text-[#f5f5f5]',
  high: 'from-[#ff6b00]/60 to-[#2a1200]/80 text-[#fff4e6]',
  medium: 'from-[#ffd200]/50 to-[#2b2500]/80 text-[#fff9d7]',
  low: 'from-[#6bff98]/50 to-[#03220f]/80 text-[#e7ffe4]',
  info: 'from-[#6bc1ff]/50 to-[#011d32]/80 text-[#e7f6ff]',
  none: 'from-[#777777]/40 to-[#111111]/80 text-[#f0f0f0]',
}

const severityLabel: Record<HookDecisionSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  info: 'Info',
  none: 'None',
}

export function HookGateNotice({
  blocked,
  severity,
  message,
  rules,
  annotations,
  sessionId,
  onDismiss,
  onReviewRules,
  onJumpToEvent,
  resolveEventContext,
}: HookGateNoticeProps) {
  const accent = severityAccent[severity] ?? severityAccent.none
  const filteredRules = useMemo(() => {
    return rules
      .map((rule) => {
        const evidence = (rule.evidence ?? []).filter((item) => typeof item.eventIndex === 'number')
        if (!evidence.length) {
          return null
        }
        return {
          ...rule,
          evidence,
        }
      })
      .filter((rule): rule is HookRuleSummary => Boolean(rule))
  }, [rules])

  const [openRuleIds, setOpenRuleIds] = useState<Set<string>>(() => new Set())
  const toggleRule = (ruleId: string) => {
    setOpenRuleIds((prev) => {
      const next = new Set(prev)
      if (next.has(ruleId)) {
        next.delete(ruleId)
      } else {
        next.add(ruleId)
      }
      return next
    })
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-lime-400/60 bg-black/90 shadow-[0_0_30px_rgba(190,255,0,0.25)]">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-80 blur-3xl',
          `bg-gradient-to-br ${accent}`,
        )}
      />
      <div className="relative z-10 flex flex-col gap-4 p-6 text-lime-50">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-lime-200/80">Hook Gate</p>
            <h3 className="text-2xl font-semibold" style={{ fontFamily: '"IBM Plex Mono", ui-monospace' }}>
              {blocked ? 'Action blocked' : 'Alignment advisory'}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-sm text-lime-200/70">Severity</p>
            <p className="text-lg font-semibold" style={{ fontFamily: '"Söhne Breit", "Space Grotesk", sans-serif' }}>
              {severityLabel[severity]}
            </p>
          </div>
        </div>
        {message ? (
          <FormattedContent text={message} className="text-sm text-lime-100/90" />
        ) : null}
        {annotations ? (
          <div className="rounded-2xl border border-lime-500/40 bg-black/60 p-4 text-xs leading-relaxed text-lime-200/90">
            <FormattedContent text={annotations} dense />
          </div>
        ) : null}
        {filteredRules.length ? (
          <div className="space-y-3">
            {filteredRules.map((rule) => {
              const isOpen = openRuleIds.has(rule.id)
              return (
                <div
                  key={rule.id}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-lime-100/90"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleRule(rule.id)}
                        className="flex flex-1 items-center justify-between gap-4 text-[11px] uppercase tracking-[0.25em] text-lime-200/80"
                      >
                        <span className="text-left">{rule.title}</span>
                        <span className="flex items-center gap-2">
                          {rule.severity.toUpperCase()}
                          <ChevronDownIcon className={cn('size-3 transition-transform', isOpen ? 'rotate-180' : 'rotate-0')} />
                        </span>
                      </button>
                      <BookmarkToggle type="rule" entityId={rule.id} label={rule.title} />
                    </div>
                    <p className="text-[10px] font-mono text-lime-200/70">Rule ID: {rule.id}</p>
                    {isOpen ? (
                      <>
                        <FormattedContent text={rule.summary} className="text-sm font-medium text-lime-50" />
                        {rule.eventRange ? (
                          <p className="mt-1 text-[11px] text-lime-200/80">
                            Events {rule.eventRange.startIndex}–{rule.eventRange.endIndex}
                            {rule.eventRange.startAt && rule.eventRange.endAt
                              ? ` • ${formatTimestamp(rule.eventRange.startAt)} → ${formatTimestamp(rule.eventRange.endAt)}`
                              : null}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {isOpen && rule.evidence?.length ? (
                      <div className="mt-3 space-y-3">
                        {rule.evidence.map((item, index) => (
                          <EvidenceCard
                            key={`${rule.id}-evidence-${index}`}
                            index={index}
                            evidence={item}
                            ruleId={rule.id}
                            sessionId={sessionId}
                            onJumpToEvent={onJumpToEvent}
                            context={
                              typeof item.eventIndex === 'number'
                                ? resolveEventContext?.(item.eventIndex)
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-xs text-lime-200/70">No rule-bound events detected.</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-xs uppercase tracking-[0.3em] text-lime-200/70">
            Decision • {blocked ? 'Denied' : 'Warn'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {onReviewRules ? (
              <button
                type="button"
                onClick={() => onReviewRules(filteredRules[0]?.id)}
                className="rounded-full border border-lime-400/70 bg-black/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-lime-50 transition hover:-translate-y-0.5"
              >
                Review rules
              </button>
            ) : null}
            {onDismiss ? (
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/80 transition hover:bg-white/10"
              >
                {blocked ? 'Dismiss notice' : 'Accept constraints'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function formatTimestamp(value?: string) {
  if (!value) return ''
  try {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toISOString()
  } catch {
    return value
  }
}
