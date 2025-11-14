import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
interface DiscoveryPanelProps {
  projectFiles: string[];
  sessionAssets: DiscoveredSessionAsset[];
  query: string;
  onQueryChange: (next: string) => void;
}
export function DiscoveryPanel({
  projectFiles,
  sessionAssets,
  query,
  onQueryChange,
}: DiscoveryPanelProps) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredSessions = normalizedQuery
    ? sessionAssets.filter((asset) => asset.path.toLowerCase().includes(normalizedQuery))
    : sessionAssets;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Use the search box to filter down session logs by path.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>
            <strong>{projectFiles.length.toLocaleString()}</strong> project files
          </span>
          <span>
            <strong>{sessionAssets.length.toLocaleString()}</strong> session assets
          </span>
        </div>
      </header>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Sessions search
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filter by file name…"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Session files</h2>
        {filteredSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No session logs match that filter.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {filteredSessions.map((asset) => (
              <li key={asset.path} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{asset.path}</p>
                  <p className="truncate text-xs text-muted-foreground">{asset.url}</p>
                </div>
                <div className="text-xs text-muted-foreground">
                  {asset.sortKey ? new Date(asset.sortKey).toLocaleString() : '—'}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
