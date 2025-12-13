import type { ReactNode } from 'react';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { SessionList } from '~/components/viewer/SessionList';

interface DiscoveryPanelProps {
  sessionAssets: DiscoveredSessionAsset[];
  generatedAtMs: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
  onFiltersRender?: (node: ReactNode | null) => void;
  uploadSlot?: ReactNode;
}

export function DiscoveryPanel({
  sessionAssets,
  generatedAtMs,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onSelectionChange,
  onAddSessionToChat,
  onFiltersRender,
  uploadSlot,
}: DiscoveryPanelProps) {
  return (
    <section className="space-y-3">
      <SessionList
        sessionAssets={sessionAssets}
        snapshotTimestamp={generatedAtMs}
        onSessionOpen={onSessionOpen}
        loadingSessionPath={loadingSessionPath}
        selectedSessionPath={selectedSessionPath}
        onSelectionChange={onSelectionChange}
        onAddSessionToChat={onAddSessionToChat}
        onFiltersRender={onFiltersRender}
        uploadSlot={uploadSlot}
      />
    </section>
  );
}
