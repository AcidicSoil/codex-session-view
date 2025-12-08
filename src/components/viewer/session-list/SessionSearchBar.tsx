import { Search } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'
import type { SessionExplorerFilterState } from './sessionExplorerTypes'

interface SessionSearchBarProps {
  filters: SessionExplorerFilterState
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void
  className?: string
}

export function SessionSearchBar({ filters, updateFilter, className }: SessionSearchBarProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        type="search"
        aria-label="Search sessions"
        value={filters.searchText}
        onChange={(event) => updateFilter('searchText', event.target.value)}
        placeholder="Search repo, branch, tag, or session id"
        className="h-11 w-full rounded-xl border border-white/10 bg-muted/20 pl-11 pr-4 text-sm text-white placeholder:text-white/40 shadow-inner shadow-black/40 transition focus-visible:ring-2 focus-visible:ring-cyan-400/60"
      />
    </div>
  )
}
