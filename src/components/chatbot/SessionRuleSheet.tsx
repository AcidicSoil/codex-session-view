import { useMemo, useState } from 'react'
import type { RuleInventoryEntry } from '~/server/lib/ruleInventory'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { HighlightedText } from '~/components/ui/highlighted-text'
import { buildSearchMatchers, matchesSearchMatchers } from '~/utils/search'

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

  const [sessionFilter, setSessionFilter] = useState<string>(activeSessionId ?? 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')

  const searchMatchers = useMemo(() => buildSearchMatchers(searchQuery), [searchQuery])

  const filteredEntries = useMemo(() => {
    let scoped = entries
    if (sessionFilter !== 'all') {
      scoped = scoped.filter((entry) => entry.sessionId === sessionFilter)
    }
    return scoped
  }, [entries, sessionFilter])

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

  const visibleRows = useMemo(() => {
    return rows.filter((row) => {
      if (severityFilter !== 'all' && row.rule.severity !== severityFilter) {
        return false
      }
      if (!searchMatchers.length) return true
      const haystack = `${row.assetPath} ${row.rule.heading} ${row.rule.summary} ${row.repoRoot ?? ''}`
      return matchesSearchMatchers(haystack, searchMatchers)
    })
  }, [rows, searchMatchers, severityFilter])

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
            <p className="text-sm text-white">{visibleRows.length} rules across {filteredEntries.length} session bindings</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search rules or repos"
              className="h-9 w-48 border-white/20 bg-black/40 text-xs text-white placeholder:text-white/50"
            />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="h-9 w-32 border-white/20 bg-black/40 text-xs uppercase tracking-[0.25em] text-white">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 text-xs text-white">
                <SelectItem value="all">All severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
            <select
              className="h-9 rounded-md border border-white/20 bg-black/40 px-3 text-xs uppercase tracking-[0.25em] text-white"
              value={sessionFilter}
              onChange={(event) => setSessionFilter(event.target.value)}
            >
              <option value="all">All sessions</option>
              {sessionOptions.map(([sessionId, assetPath]) => (
                <option key={sessionId} value={sessionId}>
                  {assetPath}
                </option>
              ))}
            </select>
          </div>
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
              {visibleRows.map((row) => {
                const color = severityColor[row.rule.severity] ?? 'text-slate-200'
                const isActive = row.sessionId === activeSessionId
                return (
                  <tr key={`${row.sessionId}-${row.rule.id}`} className={isActive ? 'bg-white/5' : undefined}>
                    <td className="px-4 py-2 align-top text-[11px] font-mono text-white/70">
                      <HighlightedText text={row.assetPath} matchers={searchMatchers} />
                    </td>
                    <td className="px-4 py-2 align-top text-[11px] text-white/60">
                      <HighlightedText text={row.repoRoot ?? 'unknown'} matchers={searchMatchers} />
                    </td>
                    <td className="px-4 py-2 align-top text-[13px] text-white">
                      <div className="font-semibold">
                        <HighlightedText text={row.rule.heading} matchers={searchMatchers} />
                      </div>
                      <div className="text-xs text-white/70">
                        <HighlightedText text={row.rule.summary} matchers={searchMatchers} />
                      </div>
                    </td>
                    <td className={`px-4 py-2 align-top text-xs font-semibold ${color}`}>
                      {row.rule.severity.toUpperCase()}
                    </td>
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
