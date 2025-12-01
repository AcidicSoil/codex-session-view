import { Badge } from '~/components/ui/badge';
import { Separator } from '~/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '~/components/ui/accordion';
import { Loader } from '~/components/ui/loader';
import { HighlightedText } from '~/components/ui/highlighted-text';
import { cn } from '~/lib/utils';
import { formatCount } from '~/utils/intl';
import type { RepositoryGroup } from './sessionExplorerTypes';
import { describeBranches, formatBytes, formatDate, formatRelativeTime, getSessionChipIntent } from './sessionExplorerUtils';
import type { SearchMatcher } from '~/utils/search';
import { SessionRepoVirtualList } from './SessionRepoVirtualList';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';

interface SessionRepositoryAccordionProps {
  groups: RepositoryGroup[];
  expandedIds: string[];
  onAccordionChange: (value: string[]) => void;
  loadingRepoId: string | null;
  snapshotTimestamp: number;
  searchMatchers: SearchMatcher[];
  onSessionOpen?: (asset: DiscoveredSessionAsset) => Promise<void> | void;
  loadingSessionPath?: string | null;
  selectedSessionPath?: string | null;
  onSelectionChange?: (path: string | null) => void;
  onAddSessionToChat?: (asset: DiscoveredSessionAsset) => void;
}

export function SessionRepositoryAccordion({
  groups,
  expandedIds,
  onAccordionChange,
  loadingRepoId,
  snapshotTimestamp,
  searchMatchers,
  onSessionOpen,
  loadingSessionPath,
  selectedSessionPath,
  onSelectionChange,
  onAddSessionToChat,
}: SessionRepositoryAccordionProps) {
  return (
    <Accordion type="multiple" value={expandedIds} onValueChange={(value) => onAccordionChange(Array.isArray(value) ? value : [value])} className="space-y-4">
      {groups.map((repo, index) => {
        const intentClass = getSessionChipIntent(repo.sessions.length);
        return (
          <div key={repo.id}>
            <AccordionItem value={repo.id} className="border-0">
              <AccordionTrigger
                aria-label={`Toggle ${repo.label} repository`}
                className={cn(
                  'rounded-2xl border border-transparent px-4 py-3 text-left transition-colors hover:no-underline focus-visible:ring-2 focus-visible:ring-ring',
                  intentClass,
                  'data-[state=open]:shadow-sm'
                )}
              >
                <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="cursor-default text-xs font-semibold uppercase tracking-wide">
                          <HighlightedText text={repo.label} matchers={searchMatchers} />
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <HighlightedText as="p" className="text-xs font-semibold" text={repo.label} matchers={searchMatchers} />
                        <p className="text-xs opacity-80">
                          Repo: <HighlightedText text={repo.repoName} matchers={searchMatchers} />
                        </p>
                        <p className="text-xs opacity-80">
                          Branches:{' '}
                          <HighlightedText text={`${describeBranches(repo.branches)} (${repo.branchCount}${repo.hasUnknownBranch ? '*' : ''})`} matchers={searchMatchers} />
                        </p>
                        <p className="text-xs opacity-80">Total size: {formatBytes(repo.totalSize)}</p>
                        <p className="text-xs opacity-80">Last updated: {formatDate(repo.lastUpdated)}</p>
                      </TooltipContent>
                    </Tooltip>
                    <Badge variant="secondary" className="text-[10px] font-semibold uppercase tracking-wide">
                      {formatCount(repo.sessions.length)}{' '}
                      {repo.sessions.length === 1 ? 'session' : 'sessions'}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide">
                      Branches {formatCount(repo.branchCount)}
                      {repo.hasUnknownBranch ? '*' : ''}
                    </Badge>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>{formatBytes(repo.totalSize)}</p>
                    <p>Updated {formatRelativeTime(repo.lastUpdated, snapshotTimestamp)}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 rounded-2xl border border-border/80 bg-muted/20 px-4 py-4">
                  {loadingRepoId === repo.id ? (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                      <Loader className="size-4" aria-label="Loading sessions" />
                      Preparing session list…
                    </div>
                  ) : (
                    repo.branches.map((branch, branchIndex) => (
                      <div key={branch.id} className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide">
                            Branch <HighlightedText text={branch.name} matchers={searchMatchers} />
                          </p>
                          <span className="text-xs text-muted-foreground">
                            {formatCount(branch.sessions.length)}{' '}
                            {branch.sessions.length === 1 ? 'session' : 'sessions'}
                          </span>
                        </div>
                        <SessionRepoVirtualList
                          sessions={branch.sessions}
                          snapshotTimestamp={snapshotTimestamp}
                          onSessionOpen={onSessionOpen}
                          loadingSessionPath={loadingSessionPath}
                          selectedSessionPath={selectedSessionPath}
                          onAddSessionToChat={onAddSessionToChat}
                          searchMatchers={searchMatchers}
                          onSelectionChange={onSelectionChange}
                        />
                        {branchIndex < repo.branches.length - 1 ? <Separator className="my-1 opacity-40" /> : null}
                      </div>
                    ))
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
            {index < groups.length - 1 ? <Separator className="my-2 opacity-50" /> : null}
          </div>
        );
      })}
    </Accordion>
  );
}
