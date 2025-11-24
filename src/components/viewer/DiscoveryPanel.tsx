import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { SessionList } from '~/components/viewer/SessionList';
import { formatCount } from '~/utils/intl';

interface DiscoveryPanelProps {
  projectFiles: string[];
  sessionAssets: DiscoveredSessionAsset[];
  generatedAtMs: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
}

export function DiscoveryPanel({
  projectFiles,
  sessionAssets,
  generatedAtMs,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onSelectionChange,
  onAddSessionToChat,
}: DiscoveryPanelProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Workspace files and pre-discovered session logs detected at build time.
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>
            <strong>{formatCount(projectFiles.length)}</strong> project files
          </span>
          <span>
            <strong>{formatCount(sessionAssets.length)}</strong> session assets
          </span>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Session explorer</h2>
        <SessionList
          sessionAssets={sessionAssets}
          snapshotTimestamp={generatedAtMs}
          onSessionOpen={onSessionOpen}
          loadingSessionPath={loadingSessionPath}
          selectedSessionPath={selectedSessionPath}
          onSelectionChange={onSelectionChange}
          onAddSessionToChat={onAddSessionToChat}
        />
      </section>
    </div>
  );
}
