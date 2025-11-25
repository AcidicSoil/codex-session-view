import { useEffect, useMemo, useState, type ReactNode, MouseEvent } from 'react'
import { motion } from 'motion/react'
import { BorderBeam } from '~/components/ui/border-beam'
import { ShimmerButton } from '~/components/ui/shimmer-button'
import {
  Snippet,
  SnippetCopyButton,
  SnippetHeader,
  SnippetTabsContent,
  SnippetTabsList,
  SnippetTabsTrigger,
} from '~/components/kibo-ui/snippet'
import {
  CodeBlock,
  CodeBlockBody,
  CodeBlockCopyButton,
  CodeBlockFiles,
  CodeBlockFilename,
  CodeBlockHeader,
  CodeBlockItem,
  CodeBlockContent,
} from '~/components/kibo-ui/code-block'
import type { BundledLanguage } from '~/components/kibo-ui/code-block'
import type { ResponseItem, MessageEvent, MessagePart } from '~/lib/viewer-types'
import type { ResponseItemParsed } from '~/lib/session-parser'
import { TimelineView } from '~/components/viewer/TimelineView'
import { eventKey } from '~/utils/event-key'
import { formatClockTime } from '~/utils/intl'
import type { SearchMatcher } from '~/utils/search'
import { HighlightedText } from '~/components/ui/highlighted-text'

export type TimelineEvent = ResponseItem | ResponseItemParsed

interface AnimatedTimelineListProps {
  events: readonly TimelineEvent[]
  className?: string
  onSelect?: (event: TimelineEvent, index: number) => void
  searchQuery?: string
  activeMatchIndex?: number | null
  onAddEventToChat?: (event: TimelineEvent, index: number) => void
  searchMatchers?: SearchMatcher[]
  getDisplayNumber?: (event: TimelineEvent, index: number) => number | null | undefined
  height?: number
}

const SNIPPET_LENGTH = 100

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
}: AnimatedTimelineListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [scrollTarget, setScrollTarget] = useState<number | null>(null)
  const [gradients, setGradients] = useState({ top: 0, bottom: 0 })
  const [beamThumb, setBeamThumb] = useState({ top: 24, height: 140 })
  const dedupedEvents = useMemo(() => dedupeTimelineEvents(events), [events])
  const items = useMemo<{ event: TimelineEvent; index: number; key: string }[]>(
    () =>
      dedupedEvents.map((event, index) => ({
        event,
        index,
        key: eventKey(event as ResponseItem, index),
      })),
    [dedupedEvents],
  )

  useEffect(() => {
    if (scrollTarget === null) return
    const id = requestAnimationFrame(() => setScrollTarget(null))
    return () => cancelAnimationFrame(id)
  }, [scrollTarget])

  useEffect(() => {
    if (activeMatchIndex == null) return
    if (activeMatchIndex < 0 || activeMatchIndex >= items.length) return
    setExpandedIndex(activeMatchIndex)
    setScrollTarget(activeMatchIndex)
  }, [activeMatchIndex, items.length])

  const handleScrollChange = ({ scrollTop, totalHeight, height }: { scrollTop: number; totalHeight: number; height: number }) => {
    const top = Math.min(scrollTop / 80, 1)
    const bottomDistance = totalHeight - (scrollTop + height)
    const bottom = totalHeight <= height ? 0 : Math.min(bottomDistance / 80, 1)
    setGradients({ top, bottom })
    const denominator = Math.max(totalHeight - height, 1)
    const ratio = totalHeight <= height ? 0 : Math.min(Math.max(scrollTop / denominator, 0), 1)
    const visibleRatio = totalHeight <= height ? 1 : height / totalHeight
    const nextHeight = Math.max(height * visibleRatio * 0.6, 60)
    setBeamThumb({ top: ratio * (height - nextHeight) + 24, height: nextHeight })
  }

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
            {renderTimelineItem(item.event, item.index, expandedIndex === item.index, () => {
              setExpandedIndex((prev) => {
                const next = prev === item.index ? null : item.index
                if (next !== null) {
                  setScrollTarget(next)
                }
                return next
              })
              onSelect?.(item.event, item.index)
            }, searchQuery, onAddEventToChat, searchMatchers, getDisplayNumber)}
          </motion.div>
        )}
        scrollToIndex={scrollTarget}
        onScrollChange={handleScrollChange}
        className="pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
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
  )
}

export function dedupeTimelineEvents(events: readonly TimelineEvent[]) {
  const seenIds = new Set<string>()
  const seenPayloads = new Set<string>()
  return events.filter((event) => {
    if (event.id) {
      const id = String(event.id)
      if (seenIds.has(id)) return false
      seenIds.add(id)
      return true
    }
    const signature = buildEventSignature(event)
    if (seenPayloads.has(signature)) return false
    seenPayloads.add(signature)
    return true
  })
}

function buildEventSignature(event: TimelineEvent) {
  switch (event.type) {
    case 'Message':
      return `msg|${event.role ?? ''}|${extractMessageText(event.content) ?? ''}`
    case 'Reasoning':
      return `reason|${event.content ?? ''}`
    case 'FunctionCall':
      return `call|${event.name ?? ''}|${safeStringify(event.args)}|${safeStringify(event.result)}`
    case 'LocalShellCall':
      return `shell|${event.command ?? ''}|${event.stdout ?? ''}|${event.stderr ?? ''}`
    case 'WebSearchCall':
      return `search|${event.query ?? ''}`
    case 'CustomToolCall':
      return `tool|${event.toolName ?? ''}|${safeStringify(event.input)}|${safeStringify(event.output)}`
    case 'FileChange':
      return `file|${event.path ?? ''}|${event.diff ?? ''}`
    default:
      return safeStringify(event)
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
) {
  const handleAddToChat = (mouseEvent: MouseEvent<HTMLButtonElement>) => {
    mouseEvent.preventDefault()
    mouseEvent.stopPropagation()
    onAddEventToChat?.(event, index)
  }
  const timestampLabel = event.at ? formatTimestamp(event.at) : null
  const resolvedDisplayNumber = getDisplayNumber?.(event, index)
  const labelNumber =
    typeof resolvedDisplayNumber === 'number' && Number.isFinite(resolvedDisplayNumber)
      ? resolvedDisplayNumber
      : index + 1
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4 cursor-pointer"
      onClick={toggle}
      role="button"
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
            {event.type === 'Message' ? (
              <ShimmerButton
                type="button"
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide"
                onClick={handleAddToChat}
              >
                Add to chat
              </ShimmerButton>
            ) : null}
          </div>
        </div>
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
  const prefix = `#${displayNumber}`
  const summary = summarizeEvent(event)
  return `${prefix} — ${summary}`
}

function summarizeEvent(event: TimelineEvent) {
  switch (event.type) {
    case 'Message': {
      const role = capitalize(event.role ?? 'message')
      return `${role}: ${truncate(extractMessageText(event.content))}`
    }
    case 'Reasoning':
      return `Reasoning: ${truncate(event.content ?? '')}`
    case 'FunctionCall': {
      const name = event.name ?? 'function'
      return `Function ${name}(${event.durationMs ? `${event.durationMs}ms` : 'call'})`
    }
    case 'LocalShellCall': {
      const snippet = summarizeCommand(event.command ?? event.stdout ?? event.stderr)
      return snippet ? `Shell ${snippet}` : 'Shell call'
    }
    case 'WebSearchCall':
      return `Web search: ${truncate(event.query ?? '')}`
    case 'CustomToolCall':
      return `Tool ${event.toolName}`
    case 'FileChange':
      return `File change: ${event.path}`
    default:
      return event.type ?? 'Event'
  }
}

function buildMetaLine(event: TimelineEvent) {
  let value: string | undefined
  switch (event.type) {
    case 'Message':
      value = [capitalize(event.role ?? 'message'), event.model].filter(Boolean).join(' · ')
      break
    case 'FunctionCall': {
      const duration = event.durationMs ? `${event.durationMs}ms` : null
      value = [event.name, duration].filter(Boolean).join(' · ')
      break
    }
    case 'LocalShellCall': {
      const exit = typeof event.exitCode === 'number' ? `exit ${event.exitCode}` : null
      const command = summarizeCommand(event.command)
      value = [command, exit].filter(Boolean).join(' · ')
      break
    }
    case 'WebSearchCall':
      value = event.query ?? 'Search'
      break
    case 'FileChange':
      value = event.path
      break
    case 'CustomToolCall':
      value = event.toolName
      break
    default:
      value = event.at ? formatTimestamp(event.at) : 'Event'
  }
  return value && value.length > 0 ? value : 'Event'
}

function renderEventDetail(event: TimelineEvent, searchQuery?: string, matchers?: SearchMatcher[]) {
  switch (event.type) {
    case 'Message': {
      const text = extractMessageText(event.content)
      return text ? (
        <DetailText value={text} label="Content" highlightQuery={searchQuery} matchers={matchers} />
      ) : (
        <EmptyDetail message="No message content." />
      )
    }
    case 'Reasoning':
      return event.content ? (
        <DetailText value={event.content} label="Trace" highlightQuery={searchQuery} matchers={matchers} />
      ) : (
        <EmptyDetail message="No reasoning trace." />
      )
    case 'FunctionCall': {
      const args = safeStringify(event.args)
      const result = safeStringify(event.result)
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
      )
    }
    case 'LocalShellCall': {
      const stdout = event.stdout ?? ''
      const stderr = event.stderr ?? ''
      const command = event.command ?? ''
      return (
        <div className="space-y-3">
          {command ? (
            <DetailText value={command} label="Command" format="code" language="bash" highlightQuery={searchQuery} />
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
      )
    }
    case 'WebSearchCall':
      return event.query ? (
        <DetailText value={event.query} label="Query" highlightQuery={searchQuery} matchers={matchers} />
      ) : (
        <EmptyDetail message="No query string." />
      )
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
      )
    case 'FileChange':
      return event.diff ? (
        <DetailText value={event.diff} label="Diff" format="code" language="diff" highlightQuery={searchQuery} />
      ) : (
        <EmptyDetail message="No diff provided." />
      )
    default: {
      const payload = safeStringify(event)
      return payload ? (
        <DetailText value={payload} label="Event" format="code" language="json" highlightQuery={searchQuery} />
      ) : (
        <EmptyDetail message="No additional data." />
      )
    }
  }
}

function DetailText({
  value,
  label,
  format = "text",
  language,
  highlightQuery,
  matchers,
}: {
  value: string
  label: string
  format?: "text" | "code"
  language?: BundledLanguage
  highlightQuery?: string
  matchers?: SearchMatcher[]
}) {
  if (!value) return null

  if (format === "code") {
    const codeLanguage = (language ?? "json") as BundledLanguage
    const data = [{ language: codeLanguage, filename: label, code: value }]
    return (
      <div
        className="space-y-1"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <CodeBlock data={data} defaultValue={codeLanguage} className="bg-background/80">
          <CodeBlockHeader className="items-center justify-between">
            <CodeBlockFiles>
              {(item) => (
                <CodeBlockFilename key={item.filename} value={item.language}>
                  {item.filename}
                </CodeBlockFilename>
              )}
            </CodeBlockFiles>
            <CodeBlockCopyButton aria-label={`Copy ${label.toLowerCase()}`} />
          </CodeBlockHeader>
          <CodeBlockBody>
            {(item) => (
              <CodeBlockItem key={item.language} value={item.language} className="bg-background/95">
                <CodeBlockContent language={codeLanguage} highlightQuery={highlightQuery}>
                  {item.code}
                </CodeBlockContent>
              </CodeBlockItem>
            )}
          </CodeBlockBody>
        </CodeBlock>
      </div>
    )
  }

  const tabValue = "value"

  return (
    <div
      className="space-y-1"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <Snippet defaultValue={tabValue}>
        <SnippetHeader>
          <SnippetTabsList>
            <SnippetTabsTrigger value={tabValue}>{label}</SnippetTabsTrigger>
          </SnippetTabsList>
          <SnippetCopyButton value={value} aria-label={`Copy ${label.toLowerCase()}`} />
        </SnippetHeader>
        <SnippetTabsContent value={tabValue}>
          <HighlightedText text={value} query={highlightQuery} matchers={matchers} />
        </SnippetTabsContent>
      </Snippet>
    </div>
  )
}

function EmptyDetail({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground">{message}</p>;
}

function extractMessageText(content: MessageEvent['content'] | undefined) {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : (part as MessagePart).text ?? ''))
      .join(' ')
  }
  return ''
}

function summarizeCommand(value?: string | null, limit = 72) {
  if (!value) return ''
  const firstLine = value.split('\n').find((line) => line.trim().length > 0)
  const trimmed = (firstLine ?? value).trim()
  return truncate(trimmed, limit)
}

function truncate(value: string, limit = SNIPPET_LENGTH) {
  if (!value) return ''
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function formatTimestamp(date: string | number | Date) {
  return formatClockTime(date)
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

function safeStringify(value: unknown) {
  if (value == null) return ''
  try {
    if (typeof value === 'string') {
      return value
    }
    return JSON.stringify(value, null, 2)
  } catch (error) {
    return String(value)
  }
}

export default AnimatedTimelineList
