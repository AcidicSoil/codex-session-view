import { Input } from '~/components/ui/input'
import { useFamilyDrawer } from '~/components/ui/family-drawer'

interface FiltersDrawerTimestampViewProps {
  from: string
  to: string
  onChange: (key: 'timestampFrom' | 'timestampTo', value: string) => void
}

export function FiltersDrawerTimestampView({ from, to, onChange }: FiltersDrawerTimestampViewProps) {
  const { setView } = useFamilyDrawer()

  return (
    <div className="space-y-5 rounded-2xl border border-white/15 bg-black/40 p-5 text-white">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => setView('default')} className="text-xs uppercase tracking-[0.3em] text-white/60">
          &lt; Back
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Timestamp Range</p>
          <p className="text-sm text-white/70">Enter UTC start and end timestamps.</p>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start" value={from} onChange={(value) => onChange('timestampFrom', value)} />
        <Field label="End" value={to} onChange={(value) => onChange('timestampTo', value)} />
      </div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">{label}</label>
      <Input
        type="datetime-local"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="border-white/15 bg-black/60 text-white"
      />
    </div>
  )
}
