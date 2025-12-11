import { useCallback, useEffect, useMemo, useState, type ReactNode, MouseEvent } from 'react';
import { motion } from 'motion/react';
import { BorderBeam } from '~/components/ui/border-beam';
import { ShimmerButton } from '~/components/ui/shimmer-button';
import { Button } from '~/components/ui/button';
import type { ResponseItem, MessageEvent, MessagePart } from '~/lib/viewer-types';
import type { BundledLanguage } from '~/components/kibo-ui/code-block';
import type { ResponseItemParsed } from '~/lib/session-parser';
import { TimelineView } from '~/components/viewer/TimelineView';
import { useTimelineBeamScrollRegistrar } from '~/components/viewer/TimelineTracingBeam';
import { eventKey } from '~/utils/event-key';
import { formatClockTime } from '~/utils/intl';
import type { SearchMatcher } from '~/utils/search';
import { HighlightedText } from '~/components/ui/highlighted-text';
import type { MisalignmentRecord, MisalignmentSeverity } from '~/lib/sessions/model';
import { Badge } from '~/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip';
import { truncateRuleTitle } from '~/lib/agents-rules/format';
import { getSeverityVisuals, toSeverityLabel } from '~/features/chatbot/severity';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '~/lib/utils';
import { SearchSnippetView } from '~/components/viewer/SearchSnippetView';
import { buildEventBadges, extractCommandMetadata } from '~/lib/session-events/toolMetadata';

export type TimelineEvent = ResponseItem | ResponseItemParsed;

interface AnimatedTimelineListProps {
  events: readonly TimelineEvent[];
  className?: string;
  onSelect?: (event: TimelineEvent, index: number) => void;
  searchQuery?: string;
  activeMatchIndex?: number | null;
  onAddEventToChat?: (event: TimelineEvent, index: number) => void;
  searchMatchers?: SearchMatcher[];
  getDisplayNumber?: (event: TimelineEvent, index: number) => number | null | undefined;
  height?: number;
  flaggedEvents?: Map<number, TimelineFlagMarker>;
  onFlaggedEventClick?: (marker: TimelineFlagMarker) => void;
  externalFocusIndex?: number | null;
}

export interface TimelineFlagMarker {
  severity: MisalignmentSeverity;
  misalignments: MisalignmentRecord[];
}

const SNIPPET_LENGTH = 100;

/**
 * Virtualized, animated timeline list used by the viewer. Rendering an empty
 * list is safe – callers should decide when to show empty-state messaging.
 */
export function AnimatedTimelineList({
  events,
  className,
  onSelect,
  searchQuery,
  activeMatchIndex,
  onAddEventToChat,
  searchMatchers,
  getDisplayNumber,
  height = 720,
  flaggedEvents,
  onFlaggedEventClick,
  externalFocusIndex,
}: AnimatedTimelineListProps) {
  const beamScrollRegistrar = useTimelineBeamScrollRegistrar()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [scrollTarget, setScrollTarget] = useState<number | null>(null);
  const [gradients, setGradients] = useState({ top: 0, bottom: 0 });
  const [beamThumb, setBeamThumb] = useState({ top: 24, height: 140 });
  const dedupedEvents = useMemo(() => dedupeTimelineEvents(events), [events]);
  const items = useMemo<{ event: TimelineEvent; index: number; key: string }[]>(
    () =>
      dedupedEvents.map((event, index) => ({
        event,
        index,
        key: eventKey(event as ResponseItem, index),
      })),
    [dedupedEvents]
  );

  const requestScroll = useCallback((index: number) => {
    setScrollTarget(index);
  }, []);

  useEffect(() => {
    if (scrollTarget === null) return
    const id = requestAnimationFrame(() => setScrollTarget(null))
    return () => cancelAnimationFrame(id)
  }, [scrollTarget])

  useEffect(() => {
    if (activeMatchIndex == null) return
    if (activeMatchIndex < 0 || activeMatchIndex >= items.length) return
    setExpandedIndex(activeMatchIndex)
    requestScroll(activeMatchIndex)
  }, [activeMatchIndex, items.length, requestScroll])

  useEffect(() => {
    if (externalFocusIndex == null) return
    if (externalFocusIndex < 0 || externalFocusIndex >= items.length) return
    setExpandedIndex(externalFocusIndex)
    requestScroll(externalFocusIndex)
  }, [externalFocusIndex, items.length, requestScroll])

  const handleScrollChange = ({
    scrollTop,
    totalHeight,
    height,
  }: {
    scrollTop: number;
    totalHeight: number;
    height: number;
  }) => {
    const top = Math.min(scrollTop / 80, 1);
    const bottomDistance = totalHeight - (scrollTop + height);
    const bottom = totalHeight <= height ? 0 : Math.min(bottomDistance / 80, 1);
    setGradients({ top, bottom });
    const denominator = Math.max(totalHeight - height, 1);
    const ratio = totalHeight <= height ? 0 : Math.min(Math.max(scrollTop / denominator, 0), 1);
    const visibleRatio = totalHeight <= height ? 1 : height / totalHeight;
    const nextHeight = Math.max(height * visibleRatio * 0.6, 60);
    setBeamThumb({ top: ratio * (height - nextHeight) + 24, height: nextHeight });
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <TimelineView
        items={items}
        height={height}
        estimateItemHeight={160}
        keyForIndex={(item) => item.key}
        renderItem={(item) => (
          <motion.div
            className="px-1 pb-4"
            initial={{ opacity: 0.6, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {renderTimelineItem(
              item.event,
              item.index,
              expandedIndex === item.index,
              () => {
                setExpandedIndex((prev) => {
                  const next = prev === item.index ? null : item.index;
                  if (next !== null) {
                    requestScroll(next)
                  }
                  return next;
                });
                onSelect?.(item.event, item.index);
              },
              searchQuery,
              onAddEventToChat,
              searchMatchers,
              getDisplayNumber,
              flaggedEvents,
              onFlaggedEventClick,
              activeMatchIndex === item.index
            )}
          </motion.div>
        )}
        scrollToIndex={scrollTarget}
        onScrollChange={handleScrollChange}
        className="pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        registerScrollContainer={beamScrollRegistrar ?? undefined}
      />
      <div className="pointer-events-none absolute inset-y-6 left-1 w-[3px] rounded-full bg-white/10">
        <motion.span
          aria-hidden
          className="absolute inset-x-0 rounded-full bg-gradient-to-b from-cyan-400 via-purple-500 to-fuchsia-500"
          style={{ top: beamThumb.top, height: beamThumb.height }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>
      <div
        className="pointer-events-none absolute inset-x-2 top-0 h-16 bg-gradient-to-b from-background to-transparent transition-opacity"
        style={{ opacity: gradients.top }}
      />
      <div
        className="pointer-events-none absolute inset-x-2 bottom-0 h-24 bg-gradient-to-t from-background to-transparent transition-opacity"
        style={{ opacity: gradients.bottom }}
      />
    </div>
  );
}

export function dedupeTimelineEvents(events: readonly TimelineEvent[]) {
  const seenIds = new Set<string>();
  const seenPayloads = new Set<string>();
  return events.filter((event) => {
    if (event.id) {
      const id = String(event.id);
      if (seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    }
    const signature = buildEventSignature(event);
    if (seenPayloads.has(signature)) return false;
    seenPayloads.add(signature);
    return true;
  });
}

function buildEventSignature(event: TimelineEvent) {
  switch (event.type) {
    case 'Message':
      return `msg|${event.role ?? ''}|${extractMessageText(event.content) ?? ''}`;
    case 'Reasoning':
      return `reason|${event.content ?? ''}`;
    case 'FunctionCall':
      return `call|${event.name ?? ''}|${safeStringify(event.args)}|${safeStringify(event.result)}`;
    case 'LocalShellCall':
      return `shell|${event.command ?? ''}|${event.stdout ?? ''}|${event.stderr ?? ''}`;
    case 'WebSearchCall':
      return `search|${event.query ?? ''}`;
    case 'CustomToolCall':
      return `tool|${event.toolName ?? ''}|${safeStringify(event.input)}|${safeStringify(event.output)}`;
    case 'FileChange':
      return `file|${event.path ?? ''}|${event.diff ?? ''}`;
    default:
      return safeStringify(event);
  }
}

function renderTimelineItem(
  event: TimelineEvent,
  index: number,
  expanded: boolean,
  toggle: () => void,
  searchQuery?: string,
  onAddEventToChat?: (event: TimelineEvent, index: number) => void,
  searchMatchers?: SearchMatcher[],
  getDisplayNumber?: (event: TimelineEvent, index: number) => number | null | undefined,
  flaggedEvents?: Map<number, TimelineFlagMarker>,
  onFlaggedEventClick?: (marker: TimelineFlagMarker) => void,
  isActiveMatch?: boolean
) {
  const handleAddToChat = (mouseEvent: MouseEvent<HTMLButtonElement>) => {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    onAddEventToChat?.(event, index);
  };
  const timestampLabel = event.at ? formatTimestamp(event.at) : null;
  const eventIndex =
    typeof (event as { index?: number }).index === 'number'
      ? (event as { index?: number }).index
      : null;
  const marker = eventIndex != null ? flaggedEvents?.get(eventIndex) : undefined;
  const severityVisual = marker ? getSeverityVisuals(marker.severity) : null;
  const resolvedDisplayNumber = getDisplayNumber?.(event, index);
  const labelNumber =
    typeof resolvedDisplayNumber === 'number' && Number.isFinite(resolvedDisplayNumber)
      ? resolvedDisplayNumber
      : index + 1;

  const eventBadges = buildEventBadges(event);

  const isChattable = [
    'Message',
    'FunctionCall',
    'LocalShellCall',
    'WebSearchCall',
    'CustomToolCall',
  ].includes(event.type);

  const handleCopyProps = async (mouseEvent: MouseEvent<HTMLButtonElement>) => {
    mouseEvent.preventDefault();
    mouseEvent.stopPropagation();
    const serialized = safeStringify(event) || '';
    if (!serialized) {
      toast.error('Nothing to copy for this event');
      return;
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(serialized);
        toast.success('Event copied');
        return;
      }
    } catch (error) {
      toast.error('Failed to copy event', {
        description: error instanceof Error ? error.message : 'Clipboard unavailable',
      });
      return;
    }
    toast.error('Clipboard unavailable in this environment');
  };

  return (
    <div
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4 transition-shadow duration-200',
        isActiveMatch
          ? 'ring-2 ring-cyan-400/70 shadow-[0_0_35px_rgba(34,211,238,0.35)]'
          : 'ring-1 ring-transparent'
      )}
      onClick={toggle}
      role="button"
      aria-current={isActiveMatch ? 'true' : undefined}
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          toggle();
        }
      }}
    >
      <BorderBeam className="opacity-70" size={120} duration={8} borderWidth={1} />
      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <HighlightedText
              text={buildLabel(event, labelNumber)}
              matchers={searchMatchers}
              className="text-sm font-semibold text-white"
            />
            <HighlightedText
              text={buildMetaLine(event)}
              matchers={searchMatchers}
              className="hidden text-xs text-muted-foreground"
            />
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {timestampLabel ? (
                <span className="rounded-full border border-white/5 bg-white/5 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {timestampLabel}
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {event.type}
              </span>
            </div>
            {marker && severityVisual ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="outline-none"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onFlaggedEventClick?.(marker);
                    }}
                  >
                    <Badge
                      variant={severityVisual.badgeVariant}
                      className={`text-[10px] font-semibold uppercase tracking-wide ${severityVisual.textClass} ${severityVisual.borderClass}`}
                    >
                      {marker.misalignments.length} issue
                      {marker.misalignments.length === 1 ? '' : 's'}
                    </Badge>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{formatMisalignmentTooltip(marker)}</TooltipContent>
              </Tooltip>
            ) : null}
            {isChattable ? (
              <ShimmerButton
                type="button"
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide"
                onClick={handleAddToChat}
              >
                Add to chat
              </ShimmerButton>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-xs uppercase tracking-wide text-muted-foreground hover:text-white"
              onClick={handleCopyProps}
            >
              <Copy className="mr-1 h-3 w-3" />
              Copy props
            </Button>
          </div>
        </div>
        {eventBadges.length ? (
          <div className="flex flex-wrap items-center gap-2">
            {eventBadges.map((badge, badgeIndex) => (
              <Badge
                key={`${badge.type}-${badge.id ?? badge.label}-${badgeIndex}`}
                variant={badge.type === 'command' ? 'secondary' : 'outline'}
                title={badge.title}
                className={cn(
                  'text-[11px] font-medium',
                  badge.type === 'command' ? 'bg-white/15 text-white' : 'text-muted-foreground'
                )}
              >
                {badge.label}
              </Badge>
            ))}
          </div>
        ) : null}
        {expanded ? (
          <div className="rounded-lg border border-white/5 bg-black/60 p-3 text-sm text-slate-100">
            {renderEventDetail(event, searchQuery, searchMatchers)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function buildLabel(event: TimelineEvent, displayNumber: number) {
  const prefix = `#${displayNumber}`;
  const summary = summarizeEvent(event);
  return `${prefix} — ${summary}`;
}

function summarizeEvent(event: TimelineEvent) {
  switch (event.type) {
    case 'Message': {
      const role = capitalize(event.role ?? 'message');
      return `${role}: ${truncate(extractMessageText(event.content))}`;
    }
    case 'Reasoning':
      return `Reasoning: ${truncate(event.content ?? '')}`;
    case 'FunctionCall': {
      if (isShellCommandFunctionCall(event)) {
        const meta = extractCommandMetadata(event);
        const commandLabel = meta.commandToken ?? meta.commandText;
        return commandLabel ? `Shell ${commandLabel}` : 'Shell command';
      }
      const name = event.name ?? 'function';
      return `Function ${name}(${event.durationMs ? `${event.durationMs}ms` : 'call'})`;
    }
    case 'LocalShellCall': {
      const snippet = summarizeCommand(event.command ?? event.stdout ?? event.stderr);
      return snippet ? `Shell ${snippet}` : 'Shell call';
    }
    case 'WebSearchCall':
      return `Web search: ${truncate(event.query ?? '')}`;
    case 'CustomToolCall':
      return `Tool ${event.toolName}`;
    case 'FileChange':
      return `File change: ${event.path}`;
    default:
      return event.type ?? 'Event';
  }
}

function buildMetaLine(event: TimelineEvent) {
  let value: string | undefined;
  switch (event.type) {
    case 'Message':
      value = [capitalize(event.role ?? 'message'), event.model].filter(Boolean).join(' · ');
      break;
    case 'FunctionCall': {
      if (isShellCommandFunctionCall(event)) {
        const duration = event.durationMs ? `${event.durationMs}ms` : null;
        const meta = extractCommandMetadata(event);
        const command = meta.commandText ?? meta.commandToken ?? event.name;
        value = [command, duration].filter(Boolean).join(' · ');
        break;
      }
      const duration = event.durationMs ? `${event.durationMs}ms` : null;
      value = [event.name, duration].filter(Boolean).join(' · ');
      break;
    }
    case 'LocalShellCall': {
      const exit = typeof event.exitCode === 'number' ? `exit ${event.exitCode}` : null;
      const command = summarizeCommand(event.command);
      value = [command, exit].filter(Boolean).join(' · ');
      break;
    }
    case 'WebSearchCall':
      value = event.query ?? 'Search';
      break;
    case 'FileChange':
      value = event.path;
      break;
    case 'CustomToolCall':
      value = event.toolName;
      break;
    default:
      value = event.at ? formatTimestamp(event.at) : 'Event';
  }
  return value && value.length > 0 ? value : 'Event';
}

function renderEventDetail(event: TimelineEvent, searchQuery?: string, matchers?: SearchMatcher[]) {
  switch (event.type) {
    case 'Message': {
      const text = extractMessageText(event.content);
      return text ? (
        <DetailText value={text} label="Content" highlightQuery={searchQuery} matchers={matchers} />
      ) : (
        <EmptyDetail message="No message content." />
      );
    }
    case 'Reasoning':
      return event.content ? (
        <DetailText
          value={event.content}
          label="Trace"
          highlightQuery={searchQuery}
          matchers={matchers}
        />
      ) : (
        <EmptyDetail message="No reasoning trace." />
      );
    case 'FunctionCall': {
      const args = safeStringify(event.args);
      const result = safeStringify(event.result);
      return (
        <div className="space-y-3">
          <DetailText
            value={args || '(no args captured)'}
            label="Args"
            format="code"
            language="json"
            highlightQuery={searchQuery}
          />
          <DetailText
            value={result || '(no result captured)'}
            label="Result"
            format="code"
            language="json"
            highlightQuery={searchQuery}
          />
        </div>
      );
    }
    case 'LocalShellCall': {
      const stdout = event.stdout ?? '';
      const stderr = event.stderr ?? '';
      const command = event.command ?? '';
      return (
        <div className="space-y-3">
          {command ? (
            <DetailText
              value={command}
              label="Command"
              format="code"
              language="bash"
              highlightQuery={searchQuery}
            />
          ) : null}
          {stdout ? (
            <DetailText
              value={stdout}
              label="stdout"
              format={event.stdoutFormat === 'code' ? 'code' : 'text'}
              language={event.stdoutFormat === 'code' ? 'diff' : undefined}
              highlightQuery={searchQuery}
              matchers={matchers}
            />
          ) : null}
          {stderr ? (
            <DetailText
              value={stderr}
              label="stderr"
              format={event.stderrFormat === 'code' ? 'code' : 'text'}
              language={event.stderrFormat === 'code' ? 'diff' : undefined}
              highlightQuery={searchQuery}
              matchers={matchers}
            />
          ) : null}
          {!command && !stdout && !stderr ? <EmptyDetail message="No captured output." /> : null}
        </div>
      );
    }
    case 'WebSearchCall':
      return event.query ? (
        <DetailText
          value={event.query}
          label="Query"
          highlightQuery={searchQuery}
          matchers={matchers}
        />
      ) : (
        <EmptyDetail message="No query string." />
      );
    case 'CustomToolCall':
      return (
        <div className="space-y-3">
          <DetailText
            value={safeStringify(event.input) || '(no input captured)'}
            label="Input"
            format="code"
            language="json"
            highlightQuery={searchQuery}
          />
          <DetailText
            value={safeStringify(event.output) || '(no output captured)'}
            label="Output"
            format="code"
            language="json"
            highlightQuery={searchQuery}
          />
        </div>
      );
    case 'FileChange':
      return event.diff ? (
        <DetailText
          value={event.diff}
          label="Diff"
          format="code"
          language="diff"
          highlightQuery={searchQuery}
        />
      ) : (
        <EmptyDetail message="No diff provided." />
      );
    default: {
      const payload = safeStringify(event);
      return payload ? (
        <DetailText
          value={payload}
          label="Event"
          format="code"
          language="json"
          highlightQuery={searchQuery}
        />
      ) : (
        <EmptyDetail message="No additional data." />
      );
    }
  }
}

function DetailText(props: {
  value: string;
  label: string;
  format?: 'text' | 'code';
  language?: BundledLanguage;
  highlightQuery?: string;
  matchers?: SearchMatcher[];
}) {
  if (!props.value) return null;
  return <SearchSnippetView {...props} />;
}

function EmptyDetail({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground">{message}</p>;
}

function isShellCommandFunctionCall(
  event: TimelineEvent
): event is Extract<TimelineEvent, { type: 'FunctionCall' }> {
  if (event.type !== 'FunctionCall') return false;
  if (typeof event.name !== 'string') return false;
  const normalized = event.name.trim().toLowerCase();
  return normalized === 'shell_command' || normalized === 'shellcommand';
}

function extractMessageText(content: MessageEvent['content'] | undefined) {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : ((part as MessagePart).text ?? '')))
      .join(' ');
  }
  return '';
}

function summarizeCommand(value?: string | null, limit = 72) {
  if (!value) return '';
  const firstLine = value.split('\n').find((line) => line.trim().length > 0);
  const trimmed = (firstLine ?? value).trim();
  return truncate(trimmed, limit);
}

function truncate(value: string, limit = SNIPPET_LENGTH) {
  if (!value) return '';
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value;
}

function formatTimestamp(date: string | number | Date) {
  return formatClockTime(date);
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
}

function formatMisalignmentTooltip(marker: TimelineFlagMarker) {
  const severityLabel = toSeverityLabel(marker.severity);
  const entries = marker.misalignments
    .map((record) => `${record.ruleId.toUpperCase()} “${truncateRuleTitle(record.title)}”`)
    .join(', ');
  return `${severityLabel} severity: ${entries}`;
}

function safeStringify(value: unknown) {
  if (value == null) return '';
  try {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
}

export default AnimatedTimelineList;
