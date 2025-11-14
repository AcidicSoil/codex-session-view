// path: src/routes/(site)/viewer/index.tsx
import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useMemo, useState } from 'react';
import { DiscoveryPanel } from '~/components/viewer/DiscoveryPanel';
import { DropZone } from '~/components/viewer/DropZone';
import { FileInputButton } from '~/components/viewer/FileInputButton';
import { AnimatedTimelineList } from '~/components/viewer/AnimatedTimelineList';
import { ChatDock } from '~/components/viewer/ChatDock';
import { useFileLoader } from '~/hooks/useFileLoader';
import { discoverProjectAssets } from '~/lib/viewerDiscovery';
import { seo } from '~/utils/seo';
import { z } from 'zod';

const searchSchema = z.object({
  query: z.string().optional(),
});

export const Route = createFileRoute('/(site)/viewer/')({
  validateSearch: (search) => {
    const result = searchSchema.safeParse(search);
    if (!result.success) {
      return { query: '' };
    }
    return {
      query: result.data.query?.trim() ?? '',
    };
  },
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
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const loader = useFileLoader();
  const [timelineQuery, setTimelineQuery] = useState('');

  const handleQueryChange = (next: string) => {
    navigate({
      search: (prev) => ({
        ...prev,
        query: next,
      }),
    });
  };

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

  const filteredEvents = useMemo(() => {
    const events = loader.state.events;
    const q = timelineQuery.trim().toLowerCase();
    if (!q) return events;

    return events.filter((event) => {
      const anyEvent = event as any;
      const parts: string[] = [];

      if (typeof anyEvent.type === 'string') parts.push(anyEvent.type);
      if (typeof anyEvent.role === 'string') parts.push(anyEvent.role);
      if (typeof anyEvent.name === 'string') parts.push(anyEvent.name);
      if (typeof anyEvent.command === 'string') parts.push(anyEvent.command);
      if (typeof anyEvent.path === 'string') parts.push(anyEvent.path);
      if (typeof anyEvent.query === 'string') parts.push(anyEvent.query);

      const content = anyEvent.content;
      if (typeof content === 'string') {
        parts.push(content);
      } else if (Array.isArray(content)) {
        parts.push(
          content
            .map((part: unknown) =>
              typeof part === 'string'
                ? part
                : typeof (part as any).text === 'string'
                  ? (part as any).text
                  : ''
            )
            .join(' ')
        );
      }

      const haystack = parts.join(' ').toLowerCase();
      if (!haystack) return false;
      return haystack.includes(q);
    });
  }, [loader.state.events, timelineQuery]);

  const timelineContent = useMemo(() => {
    if (loader.state.phase === 'parsing') {
      return (
        <p className="text-sm text-muted-foreground">
          Streaming events… large sessions may take a moment.
        </p>
      );
    }
    return <AnimatedTimelineList events={filteredEvents} />;
  }, [loader.state.phase, filteredEvents]);

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

      <DiscoveryPanel
        projectFiles={data.projectFiles}
        sessionAssets={data.sessionAssets}
        query={search.query}
        onQueryChange={handleQueryChange}
      />

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-[2fr,auto]">
            <DropZone onFile={handleFile} className="md:col-span-1" />
            <div className="flex flex-col gap-4 rounded-xl border bg-card/70 p-5">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Session controls</p>
                <p className="text-xs text-muted-foreground">
                  Upload a .jsonl/.ndjson session log.
                </p>
              </div>
              <FileInputButton onFile={handleFile} disabled={loader.state.phase === 'parsing'} />
              <dl className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>{progressLabel}</dd>
                </div>
                {meta?.timestamp ? (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Timestamp</dt>
                    <dd>{new Date(meta.timestamp).toLocaleString()}</dd>
                  </div>
                ) : null}
                {meta?.git?.repo ? (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted-foreground">Repo</dt>
                    <dd>{meta.git.repo}</dd>
                  </div>
                ) : null}
              </dl>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold">Timeline</p>
                <p className="text-xs text-muted-foreground">Animated list of parsed events.</p>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                  Timeline search
                  <input
                    type="search"
                    value={timelineQuery}
                    onChange={(event) => setTimelineQuery(event.target.value)}
                    placeholder="Filter by content, path, or type…"
                    className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-64"
                  />
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Showing {filteredEvents.length.toLocaleString()} of{' '}
                  {loader.state.events.length.toLocaleString()} events
                </p>
              </div>
            </div>
            {timelineContent}
          </div>
        </div>

        <ChatDock />
      </section>
    </main>
  );
}
