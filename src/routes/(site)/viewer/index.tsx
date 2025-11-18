// path: src/routes/(site)/viewer/index.tsx
import { ClientOnly, createFileRoute, useRouter } from '@tanstack/react-router';
import { useCallback, useState } from 'react';
import { DiscoveryPanel } from '~/components/viewer/DiscoveryPanel';
import { DropZone } from '~/components/viewer/DropZone';
import { TimelineWithFilters } from '~/components/viewer/TimelineWithFilters';
import { ChatDock } from '~/components/viewer/ChatDock';
import { Button } from '~/components/ui/button';
import { Switch } from '~/components/ui/switch';
import { sanitizeSessionFilterIds } from '~/components/viewer/SessionList';
import { useFileLoader } from '~/hooks/useFileLoader';
import { discoverProjectAssets } from '~/lib/viewer-types/viewerDiscovery';
import { seo } from '~/utils/seo';
import { toast } from 'sonner';
import { z } from 'zod';
import { persistSessionFile } from '~/server/function/sessionStore';
import { formatCount } from '~/utils/intl';
import { logDebug, logError, logInfo } from '~/lib/logger';

const searchSchema = z
  .object({
    filters: z.array(z.string()).catch([]),
    expanded: z.array(z.string()).catch([]),
  })
  .transform(({ filters, expanded }) => ({
    filters: sanitizeSessionFilterIds(filters),
    expanded: dedupeRepoSearchIds(expanded),
  }));

function dedupeRepoSearchIds(ids: string[]) {
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    cleaned.push(id);
  }
  return cleaned;
}

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export const Route = createFileRoute('/(site)/viewer/')({
  validateSearch: searchSchema,
  loader: async () => {
    logInfo('viewer.loader', 'Discovering project assets');
    try {
      const snapshot = await discoverProjectAssets();
      logInfo('viewer.loader', 'Discovered project assets', {
        projectFiles: snapshot.projectFiles.length,
        sessionAssets: snapshot.sessionAssets.length,
      });
      return snapshot;
    } catch (error) {
      logError('viewer.loader', 'Failed to discover project assets', error as Error);
      throw error;
    }
  },
  head: () => ({
    meta: seo({
      title: 'Codex Session Viewer · Discovery',
      description: 'Explore workspace files and session logs detected at build time.',
    }),
  }),
  component: ViewerRoute,
});

function ViewerRoute() {
  return (
    <ClientOnly fallback={<ViewerSkeleton />}>
      <ViewerRouteComponent />
    </ClientOnly>
  );
}

function ViewerRouteComponent() {
  const data = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const router = useRouter();
  const loader = useFileLoader();
  const [isEjecting, setIsEjecting] = useState(false);
  const [isPersistingUpload, setIsPersistingUpload] = useState(false);

  const persistUploads = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setIsPersistingUpload(true);
      logInfo('viewer.upload', 'Persisting uploads', { count: files.length });
      try {
        for (const file of files) {
          const content = await file.text();
          await persistSessionFile({ data: { filename: file.name, content } });
          logDebug('viewer.upload', 'Persisted session file', { name: file.name });
        }
        await router.invalidate();
        toast.success(
          files.length > 1
            ? `${formatCount(files.length)} sessions cached to ~/.codex/sessions`
            : 'Session cached to ~/.codex/sessions'
        );
        logInfo('viewer.upload', 'Persisted uploads successfully');
      } catch (error) {
        logError('viewer.upload', 'Failed to persist uploads', error as Error);
        toast.error('Failed to cache session', {
          description: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        setIsPersistingUpload(false);
      }
    },
    [router]
  );

  const handleFile = useCallback(
    (file: File) => {
      logInfo('viewer.dropzone', 'File selected', { name: file.name });
      loader.start(file);
      void persistUploads([file]);
    },
    [loader, persistUploads]
  );

  const handleFolderSelection = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      logInfo('viewer.dropzone', 'Folder selection received', { count: files.length });
      void persistUploads(files);
    },
    [persistUploads]
  );

  const handleFilterSearchChange = useCallback(
    (next: string[]) => {
      const sanitized = sanitizeSessionFilterIds(next);
      if (arraysEqual(sanitized, search.filters)) return;
      logDebug('viewer.filters', 'Updating filters', { next: sanitized });
      navigate({
        search: (prev) => ({ ...prev, filters: sanitized }),
        replace: true,
      });
    },
    [navigate, search.filters]
  );

  const handleExpandedSearchChange = useCallback(
    (next: string[]) => {
      const deduped = dedupeRepoSearchIds(next);
      if (arraysEqual(deduped, search.expanded)) return;
      logDebug('viewer.filters', 'Updating expanded repos', { next: deduped });
      navigate({
        search: (prev) => ({ ...prev, expanded: deduped }),
        replace: true,
      });
    },
    [navigate, search.expanded]
  );

  const meta = loader.state.meta;
  const progressLabel =
    loader.state.phase === 'parsing'
      ? `Parsing… (${formatCount(loader.progress.ok)} ok / ${formatCount(loader.progress.fail)} errors)`
      : loader.state.phase === 'success'
        ? `Loaded ${formatCount(loader.state.events.length)} events`
        : loader.state.phase === 'error' && loader.progress.fail > 0
          ? `Finished with ${formatCount(loader.progress.fail)} errors`
          : 'Idle';
  const dropZonePending = loader.state.phase === 'parsing' || isPersistingUpload;
  const dropZoneStatus = isPersistingUpload ? 'Caching session to ~/.codex/sessions…' : progressLabel;

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
        <DiscoveryPanel
          projectFiles={data.projectFiles}
          sessionAssets={data.sessionAssets}
          generatedAtMs={data.generatedAt}
          selectedFilterIds={search.filters}
          onSelectedFilterIdsChange={handleFilterSearchChange}
          expandedRepoIds={search.expanded}
          onExpandedRepoIdsChange={handleExpandedSearchChange}
        />
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]" key={data ? 'ready' : 'loading'}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Switch
                  id="persist-toggle"
                  checked={loader.persist}
                  onCheckedChange={(value) => {
                    logInfo('viewer.persist', `Toggled persist to ${value}`);
                    loader.setPersist(value);
                  }}
                />
                <label htmlFor="persist-toggle">Persist session</label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isEjecting) return
                  setIsEjecting(true)
                  logInfo('viewer.session', 'Ejecting current session')
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
              onFilesSelected={handleFolderSelection}
              acceptExtensions={['.jsonl', '.ndjson', '.txt']}
              isPending={dropZonePending}
              statusLabel={dropZoneStatus}
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

function ViewerSkeleton() {
  return (
    <main className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </main>
  );
}
