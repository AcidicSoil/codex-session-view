import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';

interface DiscoveryPanelProps {
  projectFiles: string[];
  sessionAssets: DiscoveredSessionAsset[];
}

export function DiscoveryPanel({ projectFiles, sessionAssets }: DiscoveryPanelProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Workspace files and pre-discovered session logs detected at build time.
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

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Session files</h2>
        {sessionAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No session logs discovered yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {sessionAssets.map((asset) => (
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
