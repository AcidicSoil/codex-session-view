import { useMemo, useState } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover'
import { cn } from '~/lib/utils'
import type {
  MultiSelectorProps,
  MultiSelectorGroup,
  MultiSelectorOption,
  MultiSelectorValue,
  SelectedDescriptor,
} from './types'
import { MultiSelectorTrigger } from './MultiSelectorTrigger'
import { MultiSelectorPanel } from './MultiSelectorPanel'

export function MultiSelector({
  groups,
  options,
  value,
  onChange,
  triggerLabel,
  placeholder,
  maxVisibleChips = 3,
  className,
}: MultiSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const indexedOptions = useMemo(() => {
    const map = new Map<string, MultiSelectorOption>()
    options.forEach((option) => map.set(buildOptionKey(option.groupId, option.id), option))
    return map
  }, [options])

  const selections: SelectedDescriptor[] = useMemo(() => {
    return (Object.entries(value)
      .flatMap(([groupId, ids]) =>
        ids?.map((id) => {
          const option = indexedOptions.get(buildOptionKey(groupId, id))
          return option
            ? {
                groupId,
                optionId: id,
                label: option.label,
              }
            : null
        }) || [],
      )
      .filter(Boolean) as SelectedDescriptor[])
  }, [indexedOptions, value])

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return options
    return options.filter((option) => {
      const haystack = `${option.label} ${option.description ?? ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [options, searchTerm])

  const handleOptionToggle = (groupId: string, optionId: string) => {
    const group = groups.find((item) => item.id === groupId)
    if (!group) return
    const current = value[groupId] ?? []
    if (group.allowMultiple === false) {
      const next: MultiSelectorValue = {
        ...value,
        [groupId]: current.includes(optionId) ? [] : [optionId],
      }
      onChange(normalizeValue(next, groups))
      return
    }
    const exists = current.includes(optionId)
    const nextSelection = exists ? current.filter((id) => id !== optionId) : [...current, optionId]
    const next: MultiSelectorValue = {
      ...value,
      [groupId]: nextSelection,
    }
    onChange(normalizeValue(next, groups))
  }

  const handleClearGroup = (groupId: string) => {
    const next: MultiSelectorValue = {
      ...value,
      [groupId]: [],
    }
    onChange(normalizeValue(next, groups))
  }

  const handleClearAll = () => {
    const next: MultiSelectorValue = {}
    onChange(normalizeValue(next, groups))
  }

  const hasSelections = selections.length > 0

  const handleSelectionRemove = (selection: SelectedDescriptor) => {
    handleOptionToggle(selection.groupId, selection.optionId)
  }

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn('w-full', className)}>
          <MultiSelectorTrigger
            active={hasSelections}
            label={triggerLabel}
            placeholder={placeholder}
            selections={selections}
            maxVisibleChips={maxVisibleChips}
            onClear={hasSelections ? handleClearAll : undefined}
            onRemoveSelection={handleSelectionRemove}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={14}
        className="w-[min(90vw,640px)] border border-white/15 bg-[#05060a]/95 p-0 text-white shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-3xl"
      >
        <MultiSelectorPanel
          groups={groups}
          options={filteredOptions}
          value={value}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onOptionToggle={handleOptionToggle}
          onGroupClear={handleClearGroup}
        />
      </PopoverContent>
    </Popover>
  )
}

function normalizeValue(value: MultiSelectorValue, groups: MultiSelectorGroup[]) {
  const sanitized: MultiSelectorValue = {}
  groups.forEach((group) => {
    const raw = value[group.id] ?? []
    sanitized[group.id] = Array.from(new Set(raw))
  })
  return sanitized
}

function buildOptionKey(groupId: string, optionId: string) {
  return `${groupId}:${optionId}`
}
