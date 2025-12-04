import { Search } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { InputGroup, InputGroupText } from '~/components/ui/input-group'
import { cn } from '~/lib/utils'
import type { SessionExplorerFilterState } from './sessionExplorerTypes'

interface SessionSearchBarProps {
  filters: SessionExplorerFilterState
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void
  className?: string
}

export function SessionSearchBar({ filters, updateFilter, className }: SessionSearchBarProps) {
  return (
    <div className={cn('w-full', className)}>
      <InputGroup className="w-full">
        <InputGroupText className="border-white/15 bg-white/5 text-white">
          <Search className="size-4" />
        </InputGroupText>
        <Input
          type="search"
          aria-label="Search sessions"
          value={filters.searchText}
          onChange={(event) => updateFilter('searchText', event.target.value)}
          placeholder="Search repo, branch, tag, or session id"
          className="border-white/15 bg-[#060910]/80 text-white placeholder:text-white/40 focus-visible:ring-0"
        />
      </InputGroup>
    </div>
  )
}
