import { X } from 'lucide-react'
import { cn } from '~/lib/utils'
import type { SelectedDescriptor } from './types'

interface MultiSelectorChipListProps {
  selections: SelectedDescriptor[]
  maxVisible?: number
  onRemove?: (selection: SelectedDescriptor) => void
  className?: string
}

export function MultiSelectorChipList({ selections, maxVisible = 3, onRemove, className }: MultiSelectorChipListProps) {
  if (!selections.length) {
    return null
  }
  const visible = selections.slice(0, maxVisible)
  const hiddenCount = Math.max(selections.length - visible.length, 0)
  return (
    <div className={cn('flex flex-wrap items-center gap-1', className)}>
      {visible.map((selection) => (
        <button
          key={`${selection.groupId}-${selection.optionId}`}
          type="button"
          className="group inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/80 transition hover:border-white/60 hover:text-white"
          onClick={() => onRemove?.(selection)}
        >
          <span>{selection.label}</span>
          {onRemove ? <X className="size-3 text-white/60 transition group-hover:text-white" /> : null}
        </button>
      ))}
      {hiddenCount > 0 ? (
        <span className="rounded-full border border-dashed border-white/20 px-2 py-0.5 text-[11px] text-white/60">
          +{hiddenCount}
        </span>
      ) : null}
    </div>
  )
}
