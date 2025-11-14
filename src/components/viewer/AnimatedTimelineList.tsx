import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { BorderBeam } from '~/components/ui/border-beam'
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

type TimelineEvent = ResponseItem | ResponseItemParsed

interface AnimatedTimelineListProps {
  events: readonly TimelineEvent[]
  className?: string
  onSelect?: (event: TimelineEvent, index: number) => void
}

const SNIPPET_LENGTH = 100

export function AnimatedTimelineList({ events, className, onSelect }: AnimatedTimelineListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [scrollTarget, setScrollTarget] = useState<number | null>(null)
  const [gradients, setGradients] = useState({ top: 0, bottom: 0 })
  const items = useMemo<{ event: TimelineEvent; index: number; key: string }[]>(
    () =>
      events.map((event, index) => ({
        event,
        index,
        key: eventKey(event as ResponseItem, index),
      })),
    [events],
  )

  if (!events.length) {
    return <p className="text-sm text-muted-foreground">Load or drop a session to populate the timeline.</p>
  }

  useEffect(() => {
    if (scrollTarget === null) return
    const id = requestAnimationFrame(() => setScrollTarget(null))
    return () => cancelAnimationFrame(id)
  }, [scrollTarget])

  const handleScrollChange = ({ scrollTop, totalHeight, height }: { scrollTop: number; totalHeight: number; height: number }) => {
    const top = Math.min(scrollTop / 80, 1)
    const bottomDistance = totalHeight - (scrollTop + height)
    const bottom = totalHeight <= height ? 0 : Math.min(bottomDistance / 80, 1)
    setGradients({ top, bottom })
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <TimelineView
        items={items}
        height={840}
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
            })}
          </motion.div>
        )}
        scrollToIndex={scrollTarget}
        onScrollChange={handleScrollChange}
      />
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

function renderTimelineItem(event: TimelineEvent, index: number, expanded: boolean, toggle: () => void) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4 cursor-pointer"
      onClick={toggle}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          toggle()
        }
      }}
    >
      <BorderBeam className="opacity-70" size={120} duration={8} borderWidth={1} />
      <div className="relative z-10 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-white">{buildLabel(event, index)}</p>
            <p className="text-xs text-muted-foreground">{buildMetaLine(event)}</p>
          </div>
          <span className="rounded-full border border-white/10 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {event.type}
          </span>
        </div>
        {expanded ? (
          <div className="rounded-lg border border-white/5 bg-black/60 p-3 text-sm text-slate-100">
            {renderEventDetail(event)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function buildLabel(event: TimelineEvent, index: number) {
  const prefix = `#${index + 1}`
  const formatted = event.at ? formatTimestamp(event.at) : ''
  const stamp = formatted ? ` · ${formatted}` : ''
  const summary = summarizeEvent(event)
  return `${prefix}${stamp} — ${summary}`
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
    case 'LocalShellCall':
      return `Shell ${event.command ?? ''}`.trim()
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
      value = [event.command, exit].filter(Boolean).join(' · ')
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

function renderEventDetail(event: TimelineEvent) {
  switch (event.type) {
    case 'Message': {
      const text = extractMessageText(event.content)
      return text ? <DetailText value={text} label="Content" /> : <EmptyDetail message="No message content." />
    }
        case 'Reasoning':
          return event.content ? <DetailText value={event.content} label="Trace" /> : <EmptyDetail message="No reasoning trace." />
        case 'FunctionCall': {
          const args = safeStringify(event.args)
          const result = safeStringify(event.result)
          if (!args && !result) {
            return <EmptyDetail message="No arguments or result recorded." />
          }
          return (
            <div className="space-y-3">
              <DetailText value={args} label="Args" format="code" language="json" />
              <DetailText value={result} label="Result" format="code" language="json" />
            </div>
          )
        }
        case 'LocalShellCall': {
          const stdout = event.stdout ?? ''
          const stderr = event.stderr ?? ''
          if (!stdout && !stderr) {
            return <EmptyDetail message="No output captured." />
          }
          return (
            <div className="space-y-3">
              <DetailText value={stdout} label="stdout" format="code" language="bash" />
              <DetailText value={stderr} label="stderr" format="code" language="bash" />
            </div>
          )
        }
        case 'WebSearchCall':
          return event.query ? <DetailText value={event.query} label="Query" /> : <EmptyDetail message="No query string." />
        case 'CustomToolCall': {
          const payload = safeStringify(event.output ?? event.input)
          return payload ? <DetailText value={payload} label="Payload" format="code" language="json" /> : <EmptyDetail message="No payload." />
        }
        case 'FileChange':
          return event.diff ? <DetailText value={event.diff} label="Diff" format="code" language="diff" /> : <EmptyDetail message="No diff provided." />
        default: {
          const payload = safeStringify(event)
          return payload ? <DetailText value={payload} label="Event" format="code" language="json" /> : <EmptyDetail message="No additional data." />
        }
      }
    }

function DetailText({
  value,
  label,
  format = "text",
  language,
}: {
  value: string
  label: string
  format?: "text" | "code"
  language?: BundledLanguage
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
                <CodeBlockContent language={codeLanguage}>{item.code}</CodeBlockContent>
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
        <SnippetTabsContent value={tabValue}>{value}</SnippetTabsContent>
      </Snippet>
    </div>
  )
}

function EmptyDetail({ message }: { message: string }) {
  return <p className="text-xs text-muted-foreground">{message}</p>
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

function truncate(value: string, limit = SNIPPET_LENGTH) {
  if (!value) return ''
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function formatTimestamp(date: string | number | Date) {
  const value = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date
  return Number.isNaN(value.getTime()) ? '' : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
