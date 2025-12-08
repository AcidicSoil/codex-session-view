import { useMemo, useRef } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

interface TimelineSearchBarProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onSearchNext?: () => void
  onSearchPrev?: () => void
  totalMatches?: number
  activeMatchIndex?: number | null
}

export function TimelineSearchBar({
  searchQuery,
  onSearchChange,
  onSearchNext,
  onSearchPrev,
  totalMatches = 0,
  activeMatchIndex,
}: TimelineSearchBarProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasQuery = searchQuery.trim().length > 0
  const hasMatches = hasQuery && totalMatches > 0
  const indicatorLabel = useMemo(() => {
    if (!hasQuery) return null
    if (!hasMatches) return '0 of 0'
    const current = typeof activeMatchIndex === 'number' ? activeMatchIndex + 1 : 1
    return `${current} of ${totalMatches}`
  }, [activeMatchIndex, hasMatches, hasQuery, totalMatches])

  return (
    <div className="relative flex w-full max-w-full items-center">
      <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        value={searchQuery}
        ref={inputRef}
        onChange={(event) => onSearchChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            if (event.shiftKey) {
              onSearchPrev?.()
            } else {
              onSearchNext?.()
            }
            requestAnimationFrame(() => {
              inputRef.current?.focus()
            })
          }
        }}
        placeholder="Filter by content, path, or type…"
        className={cn(
          'h-11 w-full rounded-xl border border-white/10 bg-muted/20 pl-10 pr-28 text-sm text-white shadow-inner shadow-black/40 transition focus-visible:ring-2 focus-visible:ring-cyan-400/60',
        )}
      />
      {indicatorLabel ? (
        <div className="absolute inset-y-0 right-2 flex items-center gap-2 text-xs tabular-nums text-muted-foreground">
          <span className="select-none text-[11px] uppercase tracking-wide text-slate-300/80">
            {indicatorLabel}
          </span>
          <span className="h-4 w-px bg-white/10" aria-hidden />
          <div className="flex items-center rounded-full border border-white/10 bg-black/40 p-0.5 shadow-[0_0_12px_rgba(15,23,42,0.45)]">
            <button
              type="button"
              aria-label="Previous match"
              className="flex size-6 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              disabled={!hasMatches}
              onClick={onSearchPrev}
            >
              <ChevronUp className="size-3.5" />
            </button>
            <button
              type="button"
              aria-label="Next match"
              className="flex size-6 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
              disabled={!hasMatches}
              onClick={onSearchNext}
            >
              <ChevronDown className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
