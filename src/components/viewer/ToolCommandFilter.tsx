import { useMemo } from 'react'
import { X, Check } from 'lucide-react'
import { COMMAND_FAMILIES, COMMAND_FAMILY_GROUPS, type CommandFamily } from '~/lib/session-events/toolMetadata'
import type { TimelineCommandFilterState } from '~/lib/ui-settings'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { ComboBox, ComboBoxItem, ComboBoxSection } from '~/components/ui/combobox'
import { cn } from '~/lib/utils'

interface ToolCommandFilterProps {
  value: TimelineCommandFilterState
  onChange: (next: TimelineCommandFilterState) => void
}

interface CommandFamilySection {
  id: string
  label: string
  description?: string
  items: CommandFamily[]
}

export function ToolCommandFilter({ value, onChange }: ToolCommandFilterProps) {
  const options = useMemo(() => COMMAND_FAMILIES, [])
  const familyLookup = useMemo(() => new Map(options.map((family) => [family.id, family])), [options])
  const groupedFamilies = useMemo<CommandFamilySection[]>(() => {
    const groups = COMMAND_FAMILY_GROUPS.map((group) => ({
      ...group,
      items: options.filter((family) => family.category === group.id),
    }))
    return groups.filter((group) => group.items.length > 0)
  }, [options])
  const selectedFamilies = useMemo(() => new Set(value.families), [value.families])
  const hasQuery = value.query.trim().length > 0
  const hasSelections = selectedFamilies.size > 0 || hasQuery

  const handleToggleFamily = (id: string) => {
    const exists = selectedFamilies.has(id)
    const nextFamilies = exists
      ? value.families.filter((family) => family !== id)
      : [...value.families, id]
    onChange({ ...value, families: nextFamilies })
  }

  const handleQueryChange = (next: string | null | undefined) => {
    onChange({ ...value, query: next ?? '' })
  }

  const handleClearAll = () => {
    onChange({ families: [], query: '' })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Command filters</p>
        {hasSelections ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={handleClearAll}
          >
            Clear
          </Button>
        ) : null}
      </div>
      <ComboBox
        label={undefined}
        aria-label="Command filter combobox"
        placeholder="Type a command or pick from known tools"
        inputValue={value.query}
        onInputChange={handleQueryChange}
        selectedKey={null}
        onSelectionChange={(key) => {
          if (!key) return
          handleToggleFamily(String(key))
        }}
        allowsCustomValue
        items={groupedFamilies}
      >
        {(group) => (
          <ComboBoxSection key={group.id} title={group.label} items={group.items}>
            {(item) => (
              <ComboBoxItem key={item.id} id={item.id} textValue={item.label}>
                <div className="flex flex-1 items-start gap-3">
                  <Check
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0',
                      selectedFamilies.has(item.id) ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {item.hint ?? `Matches ${item.label} commands`}
                    </span>
                  </div>
                </div>
              </ComboBoxItem>
            )}
          </ComboBoxSection>
        )}
      </ComboBox>
      {hasSelections ? (
        <div className="flex flex-wrap gap-2">
          {value.families.map((familyId) => {
            const family = familyLookup.get(familyId)
            if (!family) return null
            return (
              <Badge
                key={family.id}
                variant="secondary"
                className="inline-flex items-center gap-1 text-xs"
              >
                {family.label}
                <button
                  type="button"
                  aria-label={`Remove ${family.label}`}
                  onClick={() => handleToggleFamily(family.id)}
                  className="rounded-full border border-white/20 p-[1px] text-white/70 hover:text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          {hasQuery ? (
            <Badge
              variant="outline"
              className="inline-flex items-center gap-1 text-xs"
              title={`Command or file contains: ${value.query}`}
            >
              contains “{value.query.trim()}”
              <button
                type="button"
                aria-label="Clear text filter"
                onClick={() => handleQueryChange('')}
                className="rounded-full border border-white/20 p-[1px] text-muted-foreground hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Select one or more command families, or type a command/file substring to narrow the timeline.
        </p>
      )}
    </div>
  )
}
