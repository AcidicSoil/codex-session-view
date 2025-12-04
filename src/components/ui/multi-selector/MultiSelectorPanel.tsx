import { Check, Minus } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/utils'
import type { MultiSelectorGroup, MultiSelectorOption, MultiSelectorValue } from './types'

interface MultiSelectorPanelProps {
  groups: MultiSelectorGroup[]
  options: MultiSelectorOption[]
  value: MultiSelectorValue
  searchTerm: string
  onSearchTermChange: (value: string) => void
  onOptionToggle: (groupId: string, optionId: string) => void
  onGroupClear?: (groupId: string) => void
}

export function MultiSelectorPanel({
  groups,
  options,
  value,
  searchTerm,
  onSearchTermChange,
  onOptionToggle,
  onGroupClear,
}: MultiSelectorPanelProps) {
  const groupedOptions = groups.map((group) => ({
    group,
    options: options.filter((option) => option.groupId === group.id),
  }))
  return (
    <div className="flex h-[420px] w-full flex-col gap-3 p-4 text-white">
      <div>
        <Input
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
          placeholder="Search filters"
          className="border-white/10 bg-black/30 text-sm text-white placeholder:text-white/40 focus-visible:ring-0"
          autoFocus
        />
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 pr-2">
          {groupedOptions.map(({ group, options: groupOptions }) => (
            <div key={group.id} className="rounded-2xl border border-white/10 bg-black/30 p-3">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">{group.label}</p>
                  {group.description ? (
                    <p className="text-xs text-white/50">{group.description}</p>
                  ) : null}
                </div>
                {value[group.id]?.length ? (
                  <button
                    type="button"
                    onClick={() => onGroupClear?.(group.id)}
                    className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/60 transition hover:border-white/40 hover:text-white"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="space-y-2">
                {groupOptions.length ? (
                  groupOptions.map((option) => {
                    const selected = value[group.id]?.includes(option.id)
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => onOptionToggle(group.id, option.id)}
                        disabled={option.disabled}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-left text-sm transition',
                          option.disabled && 'opacity-50',
                          selected && !option.disabled && 'border-emerald-400/80 bg-emerald-400/10 text-white',
                          !selected && 'hover:border-white/30 hover:bg-white/5',
                        )}
                        role={group.allowMultiple === false ? 'menuitemradio' : 'menuitemcheckbox'}
                        aria-checked={selected}
                      >
                        <div>
                          <p className="font-semibold leading-tight">{option.label}</p>
                          {option.description ? (
                            <p className="text-xs text-white/60">{option.description}</p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/60">
                          {typeof option.count === 'number' ? (
                            <span className="rounded-full border border-white/10 px-2 py-0.5">{option.count}</span>
                          ) : null}
                          {selected ? <Check className="size-4 text-emerald-300" /> : <Minus className="size-4 text-white/30" />}
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <p className="text-xs text-white/50">No options available.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
