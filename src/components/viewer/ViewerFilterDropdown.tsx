import { SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { cn } from '~/lib/utils'

interface ViewerFilterDropdownProps {
  timelineFilters?: ReactNode | null
  explorerFilters?: ReactNode | null
  className?: string
}

export function ViewerFilterDropdown({ timelineFilters, explorerFilters, className }: ViewerFilterDropdownProps) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            'gap-2 rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10',
            className,
          )}
        >
          <SlidersHorizontal className="size-4" />
          Filters
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={12}
        className="w-[min(90vw,520px)] border border-white/15 bg-background/95 p-0 text-foreground shadow-2xl backdrop-blur-2xl"
      >
        <div className="max-h-[80vh] divide-y divide-border/60 overflow-y-auto">
          <section className="space-y-3 p-4">
            <header>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">Timeline filters</p>
            </header>
            <div className="space-y-4">
              {timelineFilters ?? (
                <p className="text-xs text-muted-foreground">Load or drop a session to unlock timeline filters.</p>
              )}
            </div>
          </section>
          <section className="space-y-3 p-4">
            <header>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-muted-foreground/80">Session explorer filters</p>
            </header>
            <div className="space-y-4">
              {explorerFilters ?? (
                <p className="text-xs text-muted-foreground">Session explorer filters become available once discovery data loads.</p>
              )}
            </div>
          </section>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
