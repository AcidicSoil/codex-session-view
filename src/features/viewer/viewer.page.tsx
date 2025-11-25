import { ClientOnly } from '@tanstack/react-router'
import { useFileLoader } from '~/hooks/useFileLoader'
import { DiscoverySection, useViewerDiscovery } from './viewer.discovery.section'
import { UploadTimelineSection, useUploadController } from './viewer.upload.section'
import { ChatDock } from '~/components/viewer/ChatDock'
import type { TimelineEvent } from '~/components/viewer/AnimatedTimelineList'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { logInfo } from '~/lib/logger'
import { ViewerSidebar } from './viewer.sidebar'

export function ViewerPage() {
  return (
    <ClientOnly fallback={<ViewerSkeleton />}>
      <ViewerClient />
    </ClientOnly>
  );
}

function ViewerClient() {
  const loader = useFileLoader();
  const discovery = useViewerDiscovery({ loader });
  const uploadController = useUploadController({
    loader,
    onUploadsPersisted: (assets) => discovery.appendSessionAssets(assets, 'upload'),
  });
  const handleAddTimelineEventToChat = (event: TimelineEvent, index: number) => {
    logInfo('viewer.chatdock', 'Timeline event add-to-chat requested', {
      eventType: event.type,
      index,
    });
  };
  const handleAddSessionToChat = (asset: DiscoveredSessionAsset) => {
    logInfo('viewer.chatdock', 'Session add-to-chat requested', {
      path: asset.path,
      repo: asset.repoLabel ?? asset.repoName,
    });
  };
  return (
    <main className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Codex Session Viewer</p>
          <h1 className="text-3xl font-bold tracking-tight">Workspace Discovery</h1>
          <p className="text-muted-foreground">Drop in a session to stream its timeline, then iterate with the chat dock.</p>
        </div>
        <ViewerSidebar controller={uploadController} />
      </section>

      <UploadTimelineSection controller={uploadController} onAddTimelineEventToChat={handleAddTimelineEventToChat} />
      <DiscoverySection {...discovery} onAddSessionToChat={handleAddSessionToChat} />
      <ChatDock />
    </main>
  );
}

function ViewerSkeleton() {
  return (
    <main className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </main>
  )
}
