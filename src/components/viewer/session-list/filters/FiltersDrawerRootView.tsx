import { Button } from '~/components/ui/button'
import { useFamilyDrawer } from '~/components/ui/family-drawer'
import type { FiltersDrawerSummaries } from './filterSummaries'

interface FiltersDrawerRootViewProps {
  summaries: FiltersDrawerSummaries
  onReset: () => void
  onApply: () => void
}

type FilterMenuEntry = {
  id: 'sort' | 'recency' | 'size' | 'timestamp'
  label: string
  description: string
}

const MENU_ENTRIES: FilterMenuEntry[] = [
  { id: 'sort', label: 'Sort Order', description: 'Adjust sort key and direction.' },
  { id: 'recency', label: 'Recency', description: 'Limit sessions by freshness.' },
  { id: 'size', label: 'Size Range', description: 'Filter by payload size.' },
  { id: 'timestamp', label: 'Timestamp Range', description: 'Specify start/end (UTC).' },
]

export function FiltersDrawerRootView({ summaries, onReset, onApply }: FiltersDrawerRootViewProps) {
  const { setView } = useFamilyDrawer()

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-white/15 bg-black/40 p-5 text-white">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Filters</p>
        <h2 className="text-2xl font-semibold">Adjust filters</h2>
        <p className="text-sm text-white/60">Refine sort, recency, size, and timestamps without leaving the session list.</p>
      </header>
      <div className="space-y-3">
        {MENU_ENTRIES.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setView(entry.id)}
            className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/40 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
          >
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">{entry.label}</p>
              <p className="text-xs text-white/60">{entry.description}</p>
              <p className="text-xs text-white/80">Current: {summaries[entry.id]}</p>
            </div>
            <span aria-hidden="true" className="text-lg text-white/60">
              &gt;
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="ghost" onClick={onReset} className="text-sm">
          Reset
        </Button>
        <Button type="button" onClick={onApply} className="text-sm font-semibold">
          Apply filters
        </Button>
      </div>
    </div>
  )
}
