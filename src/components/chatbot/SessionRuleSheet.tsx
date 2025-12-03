import { useMemo, useState } from 'react'
import type { RuleInventoryEntry } from '~/server/lib/ruleInventory'

const severityColor: Record<string, string> = {
  critical: 'text-rose-400',
  high: 'text-amber-400',
  medium: 'text-yellow-300',
  low: 'text-emerald-300',
  info: 'text-slate-200',
  none: 'text-slate-200',
}

interface SessionRuleSheetProps {
  entries: RuleInventoryEntry[]
  activeSessionId?: string
}

export function SessionRuleSheet({ entries, activeSessionId }: SessionRuleSheetProps) {
  const sessionOptions = useMemo(() => {
    const unique = new Map<string, string>()
    entries.forEach((entry) => {
      unique.set(entry.sessionId, entry.assetPath)
    })
    return Array.from(unique.entries())
  }, [entries])

  const [filter, setFilter] = useState<string>(activeSessionId ?? 'all')

  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter((entry) => entry.sessionId === filter)
  }, [entries, filter])

  const rows = useMemo(() => {
    return filteredEntries.flatMap((entry) =>
      entry.rules.map((rule) => ({
        sessionId: entry.sessionId,
        assetPath: entry.assetPath,
        repoRoot: entry.repoRoot,
        rule,
      })),
    )
  }, [filteredEntries])

  if (!entries.length) {
    return (
      <div className="rounded-3xl border border-white/10 bg-background/80 p-5 text-sm text-muted-foreground">
        No repo bindings yet. Highlight a session to bind AGENT rules.
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-white/15 bg-background/80 p-5 shadow-inner">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Rule Inventory</p>
            <p className="text-sm text-white">{rows.length} rules across {filteredEntries.length} session bindings</p>
          </div>
          <select
            className="rounded-md border border-white/20 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.25em] text-white"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="all">All sessions</option>
            {sessionOptions.map(([sessionId, assetPath]) => (
              <option key={sessionId} value={sessionId}>
                {assetPath}
              </option>
            ))}
          </select>
        </div>
        <div className="max-h-64 overflow-auto rounded-2xl border border-white/10 bg-black/40">
          <table className="w-full text-left text-xs text-white/80">
            <thead className="border-b border-white/10 text-[11px] uppercase tracking-[0.3em] text-white/60">
              <tr>
                <th className="px-4 py-2">Session</th>
                <th className="px-4 py-2">Repo Root</th>
                <th className="px-4 py-2">Rule</th>
                <th className="px-4 py-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const color = severityColor[row.rule.severity] ?? 'text-slate-200'
                const isActive = row.sessionId === activeSessionId
                return (
                  <tr key={`${row.sessionId}-${row.rule.id}`} className={isActive ? 'bg-white/5' : undefined}>
                    <td className="px-4 py-2 align-top text-[11px] font-mono text-white/70">{row.assetPath}</td>
                    <td className="px-4 py-2 align-top text-[11px] text-white/60">{row.repoRoot}</td>
                    <td className="px-4 py-2 align-top text-[13px] text-white">
                      <div className="font-semibold">{row.rule.heading}</div>
                      <div className="text-xs text-white/70">{row.rule.summary}</div>
                    </td>
                    <td className={`px-4 py-2 align-top text-xs font-semibold ${color}`}>{row.rule.severity.toUpperCase()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
