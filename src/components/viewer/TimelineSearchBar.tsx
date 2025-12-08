import { useMemo, useRef } from 'react'
import { ChevronDown, ChevronUp, Search } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { InputGroup, InputGroupText } from '~/components/ui/input-group'
import { Button } from '~/components/ui/button'

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
    <InputGroup className="bg-background">
      <InputGroupText>
        <Search className="size-4" />
      </InputGroupText>
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
        className="border-0 focus-visible:ring-0"
      />
      {indicatorLabel ? (
        <div className="mr-1 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{indicatorLabel}</span>
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
              aria-label="Previous match"
              disabled={!hasMatches}
              onClick={onSearchPrev}
            >
              <ChevronUp className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-full"
              aria-label="Next match"
              disabled={!hasMatches}
              onClick={onSearchNext}
            >
              <ChevronDown className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </InputGroup>
  )
}
