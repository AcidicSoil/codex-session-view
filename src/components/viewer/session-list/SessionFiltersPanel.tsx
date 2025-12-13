import { useId } from 'react'
import { Input } from '~/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import {
  SIZE_UNITS,
  type SessionExplorerFilterDimensions,
  type SessionExplorerFilterOption,
  type SessionExplorerFilterState,
  type SizeUnit,
} from './sessionExplorerTypes'
import { RECENCY_PRESETS } from './sessionExplorerUtils'

type FacetKey = 'sourceFilters' | 'branchFilters' | 'tagFilters'

interface SessionFiltersPanelProps {
  filters: SessionExplorerFilterState
  filterDimensions: SessionExplorerFilterDimensions
  updateFilter: <K extends keyof SessionExplorerFilterState>(key: K, value: SessionExplorerFilterState[K]) => void
  updateFilters: (updater: (prev: SessionExplorerFilterState) => SessionExplorerFilterState) => void
  onResetFilters?: () => void
}

export function SessionFiltersPanel({
  filters,
  filterDimensions,
  updateFilter,
  updateFilters,
  onResetFilters,
}: SessionFiltersPanelProps) {
  const facetValueMap: Record<FacetKey, string[]> = {
    sourceFilters: filters.sourceFilters,
    branchFilters: filters.branchFilters,
    tagFilters: filters.tagFilters,
  }

  const facetOptions: Record<FacetKey, SessionExplorerFilterOption[]> = {
    sourceFilters: filterDimensions.sources,
    branchFilters: filterDimensions.branches,
    tagFilters: filterDimensions.tags,
  }

  return (
    <div className="space-y-4 rounded-3xl border border-white/15 bg-[#04070f] p-4 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/70">Filters</p>
          <p className="text-xs text-white/60">Combine source, branch, tag, size, and timestamp constraints.</p>
        </div>
        {onResetFilters ? (
          <button
            type="button"
            className="self-start rounded-full border border-white/15 px-3 py-1 text-xs uppercase tracking-wide text-white/70 transition hover:border-white/40 hover:text-white"
            onClick={onResetFilters}
          >
            Reset filters
          </button>
        ) : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(Object.keys(facetOptions) as FacetKey[]).map((key) => (
          <FacetSection
            key={key}
            label={facetLabel(key)}
            description={facetDescription(key)}
            options={facetOptions[key]}
            values={facetValueMap[key]}
            onToggle={(value) => toggleFacet(updateFilters, key, value)}
            onClear={() => updateFilter(key, [])}
          />
        ))}
        <RecencySection value={filters.recency} onSelect={(value) => updateFilter('recency', value)} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <SizeRangeSection
          minValue={filters.sizeMinValue}
          minUnit={filters.sizeMinUnit}
          maxValue={filters.sizeMaxValue}
          maxUnit={filters.sizeMaxUnit}
          onValueChange={(key, value) => updateFilter(key, value)}
          onUnitChange={(key, unit) => updateFilter(key, unit)}
        />
        <TimestampRangeSection from={filters.timestampFrom} to={filters.timestampTo} onChange={(key, value) => updateFilter(key, value)} />
      </div>
    </div>
  )
}

function toggleFacet(
  updateFilters: (updater: (prev: SessionExplorerFilterState) => SessionExplorerFilterState) => void,
  key: FacetKey,
  optionId: string,
) {
  updateFilters((prev) => {
    const current = prev[key]
    const nextList = current.includes(optionId) ? current.filter((entry) => entry !== optionId) : [...current, optionId]
    return { ...prev, [key]: nextList }
  })
}

function FacetSection({
  label,
  description,
  options,
  values,
  onToggle,
  onClear,
}: {
  label: string
  description: string
  options: SessionExplorerFilterOption[]
  values: string[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const hasSelection = values.length > 0
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">{label}</p>
          <p className="text-xs text-white/50">{description}</p>
        </div>
        {hasSelection ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-white/60 transition hover:border-white/40 hover:text-white"
          >
            Clear
          </button>
        ) : null}
      </div>
      <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {options.length ? (
          options.map((option) => {
            const selected = values.includes(option.id)
            return (
              <label
                key={option.id}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-left text-sm transition hover:border-white/30 hover:bg-white/5"
              >
                <div>
                  <p className="font-semibold leading-tight">{option.label}</p>
                  {option.description ? <p className="text-xs text-white/60">{option.description}</p> : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  {typeof option.count === 'number' ? <span className="rounded-full border border-white/10 px-2 py-0.5">{option.count}</span> : null}
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggle(option.id)}
                    className="size-4 accent-white/80"
                    aria-label={`Toggle ${option.label}`}
                  />
                </div>
              </label>
            )
          })
        ) : (
          <p className="text-xs text-white/50">No options available.</p>
        )}
      </div>
    </div>
  )
}

function RecencySection({
  value,
  onSelect,
}: {
  value: SessionExplorerFilterState['recency']
  onSelect: (value: SessionExplorerFilterState['recency']) => void
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Recency</p>
        <p className="text-xs text-white/50">Only show sessions updated within a time window.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {RECENCY_PRESETS.map((preset) => {
          const selected = preset.id === value
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={`rounded-full border px-3 py-1 text-xs uppercase tracking-wide transition ${
                selected ? 'border-emerald-400/80 bg-emerald-400/10 text-white' : 'border-white/15 text-white/70 hover:border-white/40'
              }`}
            >
              {preset.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function SizeRangeSection({
  minValue,
  minUnit,
  maxValue,
  maxUnit,
  onValueChange,
  onUnitChange,
}: {
  minValue: string
  minUnit: SizeUnit
  maxValue: string
  maxUnit: SizeUnit
  onValueChange: (key: 'sizeMinValue' | 'sizeMaxValue', value: string) => void
  onUnitChange: (key: 'sizeMinUnit' | 'sizeMaxUnit', value: SizeUnit) => void
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Size range</p>
        <p className="text-xs text-white/50">Specify the minimum and maximum session size.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <RangeInput
          label="Minimum"
          value={minValue}
          unit={minUnit}
          onValueChange={(next) => onValueChange('sizeMinValue', next)}
          onUnitChange={(unit) => onUnitChange('sizeMinUnit', unit)}
        />
        <RangeInput
          label="Maximum"
          value={maxValue}
          unit={maxUnit}
          onValueChange={(next) => onValueChange('sizeMaxValue', next)}
          onUnitChange={(unit) => onUnitChange('sizeMaxUnit', unit)}
        />
      </div>
    </div>
  )
}

function RangeInput({
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
}: {
  label: string
  value: string
  unit: SizeUnit
  onValueChange: (value: string) => void
  onUnitChange: (value: SizeUnit) => void
}) {
  const inputId = useId()
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-white/60" htmlFor={inputId}>
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={0}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder="e.g. 25"
          className="border-white/10 bg-black/60 text-white"
        />
        <Select value={unit} onValueChange={(nextUnit: SizeUnit) => onUnitChange(nextUnit)}>
          <SelectTrigger className="w-[90px] border-white/20 bg-black/40 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#090c15] text-white">
            {SIZE_UNITS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function TimestampRangeSection({
  from,
  to,
  onChange,
}: {
  from: string
  to: string
  onChange: (key: 'timestampFrom' | 'timestampTo', value: string) => void
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Timestamp range</p>
        <p className="text-xs text-white/50">Filter by when the session asset was updated (UTC).</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs font-medium text-white/60" htmlFor="session-filter-ts-from">
            Start
          </label>
          <Input
            id="session-filter-ts-from"
            type="datetime-local"
            value={from}
            onChange={(event) => onChange('timestampFrom', event.target.value)}
            className="border-white/10 bg-black/60 text-white"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-white/60" htmlFor="session-filter-ts-to">
            End
          </label>
          <Input
            id="session-filter-ts-to"
            type="datetime-local"
            value={to}
            onChange={(event) => onChange('timestampTo', event.target.value)}
            className="border-white/10 bg-black/60 text-white"
          />
        </div>
      </div>
    </div>
  )
}

function facetLabel(key: FacetKey) {
  switch (key) {
    case 'sourceFilters':
      return 'Sources'
    case 'branchFilters':
      return 'Branches'
    case 'tagFilters':
      return 'Tags'
    default:
      return key
  }
}

function facetDescription(key: FacetKey) {
  switch (key) {
    case 'sourceFilters':
      return 'Bundled, external, or upload sessions'
    case 'branchFilters':
      return 'Highlight specific repository branches'
    case 'tagFilters':
      return 'Filter by session tags'
    default:
      return ''
  }
}
