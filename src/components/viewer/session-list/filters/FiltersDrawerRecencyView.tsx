import { useFamilyDrawer } from '~/components/ui/family-drawer'
import { RECENCY_PRESETS } from '../sessionExplorerUtils'
import type { SessionRecencyPreset } from '../sessionExplorerTypes'

interface FiltersDrawerRecencyViewProps {
  value: SessionRecencyPreset
  onSelect: (value: SessionRecencyPreset) => void
}

export function FiltersDrawerRecencyView({ value, onSelect }: FiltersDrawerRecencyViewProps) {
  const { setView } = useFamilyDrawer()

  return (
    <div className="space-y-5 rounded-2xl border border-white/15 bg-black/40 p-5 text-white">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => setView('default')} className="text-xs uppercase tracking-[0.3em] text-white/60">
          &lt; Back
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Recency</p>
          <p className="text-sm text-white/70">Choose a window for recently updated sessions.</p>
        </div>
      </header>
      <div className="flex flex-col gap-2">
        {RECENCY_PRESETS.map((preset) => {
          const isSelected = preset.id === value
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelect(preset.id)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${
                isSelected
                  ? 'border-emerald-400/70 bg-emerald-400/10'
                  : 'border-white/15 bg-white/5 hover:border-white/40 hover:bg-white/10'
              }`}
            >
              <p className="text-sm font-semibold">{preset.label}</p>
              <p className="text-xs text-white/60">{preset.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
