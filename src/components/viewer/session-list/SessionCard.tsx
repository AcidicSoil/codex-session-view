import { useCallback } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '~/components/ui/button';
import { ShimmerButton } from '~/components/ui/shimmer-button';
import { BorderBeam } from '~/components/ui/border-beam';
import { cn } from '~/lib/utils';
import { toast } from 'sonner';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import { HighlightedText } from '~/components/ui/highlighted-text';
import type { SearchMatcher } from '~/utils/search';
import { DATA_TEST_IDS } from '~/lib/testIds';
import {
  extractSessionId,
  formatBytes,
  formatCommit,
  formatRelativeTime,
} from './sessionExplorerUtils';
import { SessionOriginBadge } from '~/components/viewer/SessionOriginBadge';

interface SessionCardProps {
  session: DiscoveredSessionAsset;
  snapshotTimestamp: number;
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  isLoading?: boolean;
  isSelected?: boolean;
  onAddToChat?: (asset: DiscoveredSessionAsset) => void;
  searchMatchers?: SearchMatcher[];
}

export function SessionCard({
  session,
  snapshotTimestamp,
  onSessionOpen,
  isLoading,
  isSelected,
  onAddToChat,
  searchMatchers,
}: SessionCardProps) {
  const displayName = session.displayLabel;
  const repoLabel = session.repoLabel ?? session.repoName;
  const branchName = session.repoMeta?.branch ?? session.branch;
  const repoDisplay = session.repoName && session.repoName !== 'unknown-repo' ? session.repoName : null;
  const branchDisplay = branchName && branchName !== 'unknown' ? branchName : null;
  const sessionId = session.sessionId ?? extractSessionId(displayName) ?? extractSessionId(session.path);
  const branchLine = branchDisplay ? `Branch ${branchDisplay}` : '';
  const commitLine = session.repoMeta?.commit ? `Commit ${formatCommit(session.repoMeta.commit)}` : '';
  const branchMeta = [branchLine, commitLine].filter(Boolean).join(' · ');
  const statusLabel = session.statusLabel ?? session.status ?? 'unknown';
  const statusClass =
    session.status === 'running'
      ? 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100'
      : session.status === 'failed'
        ? 'bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-100'
        : session.status === 'queued'
          ? 'bg-slate-100 text-slate-900 dark:bg-slate-500/20 dark:text-slate-100'
          : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100';
  const lastUpdatedMs = session.lastUpdatedAt ? Date.parse(session.lastUpdatedAt) : session.sortKey;
  const startedMs = session.startedAt ? Date.parse(session.startedAt) : undefined;
  const completedMs = session.completedAt ? Date.parse(session.completedAt) : undefined;

  const handleCopySessionId = useCallback(async () => {
    if (!sessionId || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success('Copied session ID', { description: sessionId });
    } catch {
      toast.error('Failed to copy session ID');
    }
  }, [sessionId]);

  const handleAddToChat = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onAddToChat?.(session);
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-background via-background/60 to-muted/40 p-4',
        isSelected && 'border-primary/60 ring-2 ring-primary/50'
      )}
    >
      <BorderBeam className="opacity-50" size={120} duration={8} borderWidth={1} />
      <div className="relative z-10 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {repoLabel ? (
              <HighlightedText
                as="p"
                className="text-[11px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-300"
                text={repoLabel}
                matchers={searchMatchers}
              />
            ) : null}
            {repoDisplay ? (
              <HighlightedText
                as="p"
                className="truncate text-[11px] text-muted-foreground"
                text={repoDisplay}
                matchers={searchMatchers}
              />
            ) : null}
            {branchMeta ? (
              <HighlightedText
                as="p"
                className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                text={branchMeta}
                matchers={searchMatchers}
              />
            ) : null}
            <HighlightedText
              as="p"
              className="truncate text-sm font-semibold text-foreground"
              text={displayName}
              matchers={searchMatchers}
            />
            {sessionId ? (
              <p className="truncate text-[10px] font-mono uppercase tracking-tight text-muted-foreground">
                ID {sessionId}
              </p>
            ) : null}
            <HighlightedText
              as="p"
              className="truncate text-xs text-muted-foreground"
              text={session.path}
              matchers={searchMatchers}
            />
          </div>
          <div className="flex flex-col items-end gap-1 text-right text-xs text-muted-foreground">
            <SessionOriginBadge origin={session.origin} size="sm" />
            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', statusClass)}>
              {statusLabel}
            </span>
            <p>{formatBytes(session.size)}</p>
            {session.lastModifiedIso ? (
              <p className="font-mono text-[10px] uppercase tracking-tight text-muted-foreground" aria-label="Last modified timestamp">
                {session.lastModifiedIso}
              </p>
            ) : null}
            {startedMs ? <p>Started {formatRelativeTime(startedMs, snapshotTimestamp)}</p> : null}
            {completedMs ? <p>Completed {formatRelativeTime(completedMs, snapshotTimestamp)}</p> : null}
            <p>{formatRelativeTime(lastUpdatedMs, snapshotTimestamp)}</p>
            {isSelected ? (
              <span className="mt-1 inline-flex rounded-full border border-primary/30 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                Selected
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {session.tags?.slice(0, 3).map((tag) => (
            <span key={`${session.path}-${tag}`} className="rounded-full border border-border/70 px-2 py-0.5">
              <HighlightedText text={tag} matchers={searchMatchers} />
            </span>
          ))}
          {session.tags && session.tags.length > 3 ? <span>+{session.tags.length - 3}</span> : null}
          <div className="ml-auto flex items-center gap-2">
            {sessionId ? (
              <Button type="button" size="sm" variant="outline" onClick={handleCopySessionId}>
                <Copy className="mr-1 size-4" />
                Copy ID
              </Button>
            ) : null}
            <ShimmerButton
              type="button"
              className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
              onClick={handleAddToChat}
            >
              Add to chat
            </ShimmerButton>
            {onSessionOpen ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={isLoading}
                data-testid={DATA_TEST_IDS.sessionLoadButton}
                onClick={() => onSessionOpen(session)}
                title="Open the session in the timeline inspector"
              >
                {isLoading ? 'Loading…' : 'Open session'}
              </Button>
            ) : null}
            <a
              className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
              href={session.url}
              target="_blank"
              rel="noreferrer"
              title="Open the raw session file in a new tab"
            >
              Open session file
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
import type { MouseEvent as ReactMouseEvent } from 'react';
