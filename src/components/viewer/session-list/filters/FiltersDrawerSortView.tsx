import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import { useFamilyDrawer } from '~/components/ui/family-drawer'
import type { SortDirection, SortKey } from '../sessionExplorerTypes'

interface FiltersDrawerSortViewProps {
  sortKey: SortKey
  sortDir: SortDirection
  onSortKeyChange: (value: SortKey) => void
  onSortDirChange: (value: SortDirection) => void
}

export function FiltersDrawerSortView({ sortKey, sortDir, onSortKeyChange, onSortDirChange }: FiltersDrawerSortViewProps) {
  const { setView } = useFamilyDrawer()

  return (
    <div className="space-y-5 rounded-2xl border border-white/15 bg-black/40 p-5 text-white">
      <header className="flex items-center gap-3">
        <button type="button" onClick={() => setView('default')} className="text-xs uppercase tracking-[0.3em] text-white/60">
          &lt; Back
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">Sort Order</p>
          <p className="text-sm text-white/70">Choose how sessions are ordered.</p>
        </div>
      </header>
      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">Sort key</p>
        <Select value={sortKey} onValueChange={(value: SortKey) => onSortKeyChange(value)}>
          <SelectTrigger className="w-full border-white/20 bg-black/60 text-white">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#090c15] text-white">
            <SelectItem value="timestamp">Timestamp</SelectItem>
            <SelectItem value="size">Size</SelectItem>
          </SelectContent>
        </Select>
      </section>
      <section className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/60">Direction</p>
        <ToggleGroup
          type="single"
          value={sortDir}
          onValueChange={(value) => value && onSortDirChange(value as SortDirection)}
          className="inline-flex rounded-full border border-white/20 bg-black/60"
          aria-label="Sort direction"
        >
          <ToggleGroupItem value="asc" className="px-4 py-2 text-xs text-white/80">
            ASC
          </ToggleGroupItem>
          <ToggleGroupItem value="desc" className="px-4 py-2 text-xs text-white/80">
            DESC
          </ToggleGroupItem>
        </ToggleGroup>
      </section>
    </div>
  )
}
