import { useId } from 'react'
import { Input } from '~/components/ui/input'
import { useFamilyDrawer } from '~/components/ui/family-drawer'
import type { SizeUnit } from '../sessionExplorerTypes'

interface FiltersDrawerSizeViewProps {
  minValue: string
  maxValue: string
  minUnit: SizeUnit
  maxUnit: SizeUnit
  onValueChange: (key: 'sizeMinValue' | 'sizeMaxValue', value: string) => void
  onUnitChange: (key: 'sizeMinUnit' | 'sizeMaxUnit', unit: SizeUnit) => void
}

export function FiltersDrawerSizeView({ minValue, maxValue, minUnit, maxUnit, onValueChange, onUnitChange }: FiltersDrawerSizeViewProps) {
  const { setView } = useFamilyDrawer()

  const handleMinChange = (value: string) => {
    onValueChange('sizeMinValue', value)
    if (minUnit !== 'MB') {
      onUnitChange('sizeMinUnit', 'MB')
    }
  }

  const handleMaxChange = (value: string) => {
    onValueChange('sizeMaxValue', value)
    if (maxUnit !== 'MB') {
      onUnitChange('sizeMaxUnit', 'MB')
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-white/15 bg-black/40 p-5 text-white">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => setView('default')} className="text-xs uppercase tracking-[0.3em] text-white/60">
          &lt; Back
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Size Range</p>
          <p className="text-sm text-white/70">Provide minimum and maximum session size in MB.</p>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Minimum (MB)" value={minValue} onChange={handleMinChange} />
        <Field label="Maximum (MB)" value={maxValue} onChange={handleMaxChange} />
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (next: string) => void }) {
  const inputId = useId()
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-[0.2em] text-white/60" htmlFor={inputId}>
        {label}
      </label>
      <Input
        id={inputId}
        type="number"
        inputMode="numeric"
        value={value}
        placeholder="e.g. 25"
        min={0}
        onChange={(event) => onChange(event.target.value)}
        className="border-white/15 bg-black/60 text-white"
      />
    </div>
  )
}
