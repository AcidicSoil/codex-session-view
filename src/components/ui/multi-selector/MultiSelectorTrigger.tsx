import { Filter, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { SelectedDescriptor } from './types'
import { MultiSelectorChipList } from './MultiSelectorChipList'

interface MultiSelectorTriggerProps {
  active: boolean
  label?: string
  placeholder?: string
  selections: SelectedDescriptor[]
  maxVisibleChips?: number
  onClear?: () => void
  onRemoveSelection?: (selection: SelectedDescriptor) => void
  className?: string
}

export function MultiSelectorTrigger({
  active,
  label = 'Filters',
  placeholder = 'Select filters',
  selections,
  maxVisibleChips = 3,
  onClear,
  onRemoveSelection,
  className,
}: MultiSelectorTriggerProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className={cn(
        'group flex w-full flex-col items-start gap-2 rounded-2xl border border-white/15 bg-[#05060a]/80 px-4 py-3 text-left text-white shadow-[0_8px_30px_rgba(3,4,10,0.55)] transition hover:border-white/40',
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/60">
          <Filter className="size-3.5 text-emerald-300" />
          {label}
        </div>
        {active && onClear ? (
          <button
            type="button"
            aria-label="Clear filters"
            onClick={(event) => {
              event.stopPropagation()
              onClear?.()
            }}
            className="rounded-full border border-white/10 p-1 text-white/60 transition hover:border-white/40 hover:text-white"
          >
            <X className="size-3" />
          </button>
        ) : null}
      </div>
      {selections.length ? (
        <MultiSelectorChipList
          selections={selections}
          maxVisible={maxVisibleChips}
          className="w-full"
          onRemove={onRemoveSelection}
        />
      ) : (
        <p className="text-sm text-white/60">{placeholder}</p>
      )}
    </Button>
  )
}
