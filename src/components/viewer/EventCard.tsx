import { Card } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { BorderBeam } from '~/components/ui/border-beam';
import type { MessagePart, ResponseItem } from '~/lib/viewer-types';
import { cn } from '~/lib/utils';
import { LocalTimestamp } from '~/components/viewer/LocalTimestamp';

function summarizeShellSnippet(event: Extract<ResponseItem, { type: 'LocalShellCall' }>) {
  const preferred = event.stdout?.trim() || event.stderr?.trim() || event.command || '';
  const firstLine = preferred.split('\n').find((line) => line.trim().length > 0) ?? preferred;
  return truncateSnippet(firstLine.trim(), 140);
}

function truncateSnippet(value: string, limit = 140) {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function renderSummary(event: ResponseItem) {
  switch (event.type) {
    case 'Message': {
      const text =
        typeof event.content === 'string'
          ? event.content
          : Array.isArray(event.content)
            ? event.content
                .map((part: string | MessagePart) =>
                  typeof part === 'string' ? part : (part.text ?? '')
                )
                .join('\n')
            : '';
      return text;
    }
    case 'Reasoning':
      return event.content;
    case 'FunctionCall':
      return JSON.stringify({ name: event.name, args: event.args }, null, 2);
    case 'LocalShellCall':
      return summarizeShellSnippet(event);
    case 'FileChange':
      // Updated to show diff/content if available
      if (event.diff) {
        return `${event.path}\n\n${event.diff}`;
      }
      return event.path;
    case 'WebSearchCall':
      return event.query;
    default:
      return JSON.stringify(event, null, 2);
  }
}

function typeAccent(type: ResponseItem['type']) {
  switch (type) {
    case 'Message':
      return 'bg-muted text-foreground';
    case 'LocalShellCall':
      return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200';
    case 'FunctionCall':
      return 'bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200';
    case 'FileChange':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200';
    default:
      return 'bg-secondary text-secondary-foreground';
  }
}

interface EventCardProps {
  item: ResponseItem;
  index: number;
}

export function EventCard({ item, index }: EventCardProps) {
  const summary = renderSummary(item);
  return (
    <Card className="relative overflow-hidden rounded-lg border bg-card/70 px-4 py-3">
      <BorderBeam className="opacity-80" size={120} duration={8} borderWidth={1.5} />
      <div className="relative z-10 space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className={cn('px-2 py-0.5 text-[11px] uppercase tracking-wide', typeAccent(item.type))}
          >
            {item.type}
          </Badge>
          <span>#{index + 1}</span>
          {item.type === 'Message' && typeof (item as any).role === 'string' ? (
            <span>{(item as any).role}</span>
          ) : null}
          {item.at ? (
            <LocalTimestamp
              value={item.at}
              variant="datetime"
              showZone
              className="text-muted-foreground"
            />
          ) : null}
        </div>
        <div className="space-y-2">
          {item.type === 'Message' ? (
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-sm leading-relaxed">
              {summary}
            </pre>
          ) : (
            summary && (
              <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                {summary}
              </pre>
            )
          )}
          {!summary && <p className="text-sm text-muted-foreground">No additional details</p>}
        </div>
      </div>
    </Card>
  );
}
