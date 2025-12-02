import type { HookDecisionSeverity, HookRuleSummary } from '~/server/lib/hookifyRuntime'
import { cn } from '~/lib/utils'

interface HookGateNoticeProps {
  blocked: boolean
  severity: HookDecisionSeverity
  message?: string
  rules: HookRuleSummary[]
  annotations?: string
  onDismiss?: () => void
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
  onDismiss,
}: HookGateNoticeProps) {
  const accent = severityAccent[severity] ?? severityAccent.none
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
          <p className="text-sm text-lime-100/90">{message}</p>
        ) : null}
        {annotations ? (
          <div className="rounded-2xl border border-lime-500/40 bg-black/60 p-4 text-xs leading-relaxed text-lime-200/90">
            {annotations}
          </div>
        ) : null}
        {rules.length ? (
          <div className="space-y-1">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-lime-100/90"
              >
                <p className="font-semibold">[{rule.severity.toUpperCase()}] {rule.title}</p>
                <p className="opacity-80">{rule.summary}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs uppercase tracking-[0.3em] text-lime-200/70">
            Decision • {blocked ? 'Denied' : 'Warn'}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-lime-400/70 bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-50 shadow-[4px_4px_0_0_rgba(190,255,0,0.5)] transition hover:-translate-y-0.5"
          >
            {blocked ? 'Review rules' : 'Accept constraints'}
          </button>
        </div>
      </div>
    </div>
  )
}
