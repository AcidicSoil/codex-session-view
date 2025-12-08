import { useMemo, useState } from 'react'
import type { MisalignmentSeverity } from '~/lib/sessions/model'
import type { RuleInventoryEntry } from '~/lib/ruleInventoryTypes'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { HighlightedText } from '~/components/ui/highlighted-text'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/utils'
import { buildSearchMatchers, matchesSearchMatchers } from '~/utils/search'
import { getSeverityVisuals } from '~/features/chatbot/severity'

export interface RuleViolationSummary {
  count: number
  eventIndexes: number[]
  severity: MisalignmentSeverity
}

interface SessionRuleSheetProps {
  entries: RuleInventoryEntry[]
  activeSessionId?: string
  ruleViolations?: Map<string, RuleViolationSummary>
  onNavigateToEvent?: (eventIndex: number) => void
}

export function SessionRuleSheet({ entries, activeSessionId, ruleViolations, onNavigateToEvent }: SessionRuleSheetProps) {
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
    <div className="flex h-full min-h-0 flex-col rounded-3xl border border-white/15 bg-background/80 p-5 shadow-inner">
      <div className="flex h-full min-h-0 flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Rule Inventory</p>
            <p className="text-sm text-white">
              {visibleRows.length} rules · {filteredEntries.length} bindings
            </p>
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
        <ScrollArea className="flex-1 min-h-0 rounded-2xl border border-white/10 bg-black/40 p-1">
          <div className="space-y-3">
            {visibleRows.map((row, index) => {
              const isActive = row.sessionId === activeSessionId
              const violation = ruleViolations?.get(row.rule.id)
              return (
                <article
                  key={`${row.sessionId}-${row.assetPath}-${row.rule.id}-${index}`}
                  className={cn(
                    'rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/30',
                    isActive && 'outline outline-1 outline-white/30',
                  )}
                >
                  <header className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-mono uppercase tracking-wide text-white/70">
                        <HighlightedText text={row.assetPath} matchers={searchMatchers} />
                      </p>
                      <p className="text-[11px] text-white/50">
                        <HighlightedText text={row.repoRoot ?? 'unknown repo'} matchers={searchMatchers} />
                      </p>
                    </div>
                    <SeverityBadge severity={row.rule.severity} />
                  </header>
                  <div className="mt-3 space-y-1">
                    <h3 className="text-base font-semibold text-white">
                      <HighlightedText text={row.rule.heading} matchers={searchMatchers} />
                    </h3>
                    <p
                      className="line-clamp-3 text-sm text-white/70"
                      title={row.rule.summary}
                    >
                      <HighlightedText text={row.rule.summary} matchers={searchMatchers} />
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wide text-white/50">
                    <span className="truncate">Instruction: {row.rule.sourcePath ?? 'unknown'}</span>
                  </div>
                  {violation ? (
                    <footer className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white/70">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Violations</p>
                        <p className="text-sm text-white">
                          {violation.count} linked {violation.count === 1 ? 'event' : 'events'}
                        </p>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <SeverityBadge severity={violation.severity} subtle />
                        {onNavigateToEvent && violation.eventIndexes.length ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="text-xs uppercase tracking-[0.2em]"
                            onClick={() => onNavigateToEvent(violation.eventIndexes[0])}
                          >
                            Inspect event
                          </Button>
                        ) : null}
                      </div>
                    </footer>
                  ) : null}
                </article>
              )
            })}
            {!visibleRows.length ? (
              <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-sm text-white/60">
                No rules match the current filters.
              </div>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

function SeverityBadge({ severity, subtle = false }: { severity: MisalignmentSeverity; subtle?: boolean }) {
  const visuals = getSeverityVisuals(severity)
  if (subtle) {
    return (
      <Badge variant="outline" className={cn('border-transparent text-[11px] uppercase tracking-wide', visuals.textClass)}>
        {severity.toUpperCase()}
      </Badge>
    )
  }
  return (
    <Badge
      variant={visuals.badgeVariant}
      className={cn(
        'text-[11px] uppercase tracking-[0.25em]',
        visuals.badgeVariant === 'destructive' && 'bg-rose-500/20 text-rose-100',
      )}
    >
      {severity}
    </Badge>
  )
}
