import { AlertCircle } from 'lucide-react'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { SessionOriginBadge } from '~/components/viewer/SessionOriginBadge'
import type { TimelineOriginFilterState } from '~/lib/ui-settings'
import { cn } from '~/lib/utils'

interface TimelineOriginFiltersProps {
  value: TimelineOriginFilterState
  onChange: (next: TimelineOriginFilterState) => void
  stats: { codex: number; geminiCli: number; unknown: number }
}

export function TimelineOriginFilters({ value, onChange, stats }: TimelineOriginFiltersProps) {
  const selected = [
    value.codex ? 'codex' : null,
    value.geminiCli ? 'gemini-cli' : null,
  ].filter(Boolean) as Array<'codex' | 'gemini-cli'>

  const handleChange = (next: string[]) => {
    const normalized: TimelineOriginFilterState = {
      codex: next.includes('codex'),
      geminiCli: next.includes('gemini-cli'),
    }
    if (!normalized.codex && !normalized.geminiCli) {
      return
    }
    onChange(normalized)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold text-white">
        <p>Origin visibility</p>
        <div className="flex items-center gap-2">
          <SessionOriginBadge origin="codex" size="sm" />
          <SessionOriginBadge origin="gemini-cli" size="sm" />
        </div>
      </div>
      <ToggleGroup
        type="multiple"
        value={selected}
        onValueChange={handleChange}
        variant="outline"
        spacing={0}
        className="w-full justify-between"
      >
        <ToggleGroupItem value="codex" className={cn('flex-1 text-xs', !value.codex && 'opacity-70')}>
          Codex ({stats.codex})
        </ToggleGroupItem>
        <ToggleGroupItem value="gemini-cli" className={cn('flex-1 text-xs', !value.geminiCli && 'opacity-70')}>
          Gemini CLI ({stats.geminiCli})
        </ToggleGroupItem>
      </ToggleGroup>
      {stats.unknown > 0 ? (
        <p className="flex items-center gap-2 text-xs text-amber-300">
          <AlertCircle className="h-3 w-3" />
          {stats.unknown} event{stats.unknown === 1 ? '' : 's'} missing origin metadata; badges hidden.
        </p>
      ) : null}
    </div>
  )
}
