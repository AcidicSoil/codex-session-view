import { useMemo } from 'react'
import { formatCount, formatDateTime } from '~/utils/intl'
import { DiscoverySection } from '../viewer.discovery.section'
import { useViewerWorkspace } from '../viewer.page'

export function ViewerExplorerView() {
  const { discovery, handleAddSessionToChat } = useViewerWorkspace()
  const snapshotTimestamp = discovery.snapshot?.generatedAt ?? Date.now()
  const repoCount = useMemo(() => {
    const repoNames = discovery.sessionAssets.map((asset) => asset.repoLabel ?? asset.repoName ?? asset.repoMeta?.repo)
    return new Set(repoNames.filter(Boolean)).size
  }, [discovery.sessionAssets])

  return (
    <div className="space-y-8">
      <header className="grid gap-4 rounded-3xl border border-white/10 bg-background/80 p-6 shadow-inner sm:grid-cols-2 lg:grid-cols-4">
        <ExplorerMetric label="Cached sessions" value={formatCount(discovery.sessionAssets.length)} detail="JSONL assets discovered from uploads & repos" />
        <ExplorerMetric label="Linked repos" value={formatCount(repoCount)} detail="Unique repositories detected in the snapshot" />
        <ExplorerMetric label="Snapshot generated" value={formatDateTime(snapshotTimestamp, { fallback: 'Unknown' })} detail="Last successful discovery run" />
        <ExplorerMetric label="Selected session" value={discovery.selectedSessionPath ? discovery.selectedSessionPath.split(/[/\\]/).pop() ?? '—' : 'None'} detail="Pick a session below to inspect" />
      </header>
      <DiscoverySection
        {...discovery}
        onFiltersRender={undefined}
        onAddSessionToChat={handleAddSessionToChat}
      />
    </div>
  )
}

function ExplorerMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
      <p className="text-xs uppercase tracking-[0.3em] text-white/60">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-white/70">{detail}</p>
    </div>
  )
}
