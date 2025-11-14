// path: src/routes/(site)/viewer/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { DiscoveryPanel } from '~/components/viewer/DiscoveryPanel';
import { DropZone } from '~/components/viewer/DropZone';
import { TimelineWithFilters } from '~/components/viewer/TimelineWithFilters';
import { ChatDock } from '~/components/viewer/ChatDock';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { useFileLoader } from '~/hooks/useFileLoader';
import { discoverProjectAssets } from '~/lib/viewerDiscovery';
import { seo } from '~/utils/seo';
import { toast } from 'sonner';

export const Route = createFileRoute('/(site)/viewer/')({
  loader: () => discoverProjectAssets(),
  head: () => ({
    meta: seo({
      title: 'Codex Session Viewer · Discovery',
      description: 'Explore workspace files and session logs detected at build time.',
    }),
  }),
  component: ViewerRouteComponent,
});

function ViewerRouteComponent() {
  const data = Route.useLoaderData();
  const loader = useFileLoader();
  const [isEjecting, setIsEjecting] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      loader.start(file);
    },
    [loader]
  );

  const meta = loader.state.meta;
  const progressLabel =
    loader.state.phase === 'parsing'
      ? `Parsing… (${loader.progress.ok.toLocaleString()} ok / ${loader.progress.fail.toLocaleString()} errors)`
      : loader.state.phase === 'success'
        ? `Loaded ${loader.state.events.length.toLocaleString()} events`
        : loader.state.phase === 'error' && loader.progress.fail > 0
          ? `Finished with ${loader.progress.fail.toLocaleString()} errors`
          : 'Idle';

  const hasEvents = loader.state.events.length > 0
  const timelineContent = loader.state.phase === 'parsing'
    ? (
        <p className="text-sm text-muted-foreground">
          Streaming events… large sessions may take a moment.
        </p>
      )
    : hasEvents
      ? <TimelineWithFilters events={loader.state.events} />
      : (
        <p className="text-sm text-muted-foreground">
          Load a session to see its timeline here.
        </p>
      )

  return (
    <main className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
      <section className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Codex Session Viewer
        </p>
        <h1 className="text-3xl font-bold tracking-tight">Workspace Discovery</h1>
        <p className="text-muted-foreground">
          Drop in a session to stream its timeline, then iterate with the chat dock.
        </p>
      </section>

      {data ? (
        <DiscoveryPanel projectFiles={data.projectFiles} sessionAssets={data.sessionAssets} />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]" key={data ? 'ready' : 'loading'}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Switch
                  id="persist-toggle"
                  checked={loader.persist}
                  onCheckedChange={(value) => loader.setPersist(value)}
                />
                <label htmlFor="persist-toggle">Persist session</label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isEjecting) return
                  setIsEjecting(true)
                  loader.reset()
                  toast.success('Session cleared')
                  setTimeout(() => setIsEjecting(false), 150)
                }}
                disabled={loader.state.events.length === 0 || isEjecting}
              >
                {isEjecting ? 'Ejecting…' : 'Eject session'}
              </Button>
            </div>
          <div className="flex justify-start">
            <DropZone
              onFile={handleFile}
              acceptExtensions={['.jsonl', '.ndjson', '.txt']}
              isPending={loader.state.phase === 'parsing'}
              statusLabel={progressLabel}
              meta={meta}
            />
          </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="mb-4">
              <p className="text-sm font-semibold">Timeline</p>
              <p className="text-xs text-muted-foreground">Animated list of parsed events.</p>
            </div>
            {timelineContent}
          </div>
        </div>

        <ChatDock />
      </section>
    </main>
  );
}
