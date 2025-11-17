import { createFileRoute, useRouter } from '@tanstack/react-router';
import { Button } from '~/components/ui/button';
import { formatDateTime } from '~/utils/intl';
import { getBrowserLogs, type BrowserLogSnapshot } from '~/server/function/browserLogs';
import 'virtual:browser-echo'; // Ensure browser-echo patches the runtime when route is bundled

interface LogsLoaderData {
  snapshot: BrowserLogSnapshot;
}

export const Route = createFileRoute('/logs')({
  loader: async (): Promise<LogsLoaderData> => ({
    snapshot: await getBrowserLogs(),
  }),
  component: LogsPage,
});

function LogsPage() {
  const router = useRouter();
  const { snapshot } = Route.useLoaderData() as LogsLoaderData;

  const handleRefresh = () => {
    router.invalidate();
  };

  return (
    <main className="container mx-auto flex max-w-5xl flex-col gap-4 px-4 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Browser Echo
          </p>
          <h1 className="text-2xl font-bold leading-tight">Client Logs</h1>
          <p className="text-sm text-muted-foreground">
            {snapshot.source ? `Latest file: ${snapshot.source}` : 'No log file detected'} · Updated{' '}
            {formatDateTime(snapshot.updatedAt)}
            {snapshot.truncated ? ' · Showing most recent entries' : ''}
          </p>
        </div>
        <Button size="sm" onClick={handleRefresh} className="self-start sm:self-auto">
          Refresh logs
        </Button>
      </div>

      <section className="rounded-2xl border border-border bg-card/70 p-4">
        <pre className="max-h-[70vh] whitespace-pre-wrap overflow-auto text-sm leading-relaxed text-muted-foreground">
          {snapshot.text || '(no log output)'}
        </pre>
      </section>
    </main>
  );
}