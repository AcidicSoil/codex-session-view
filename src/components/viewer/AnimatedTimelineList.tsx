import { useMemo, useState } from 'react'
import AnimatedList from '~/components/AnimatedList'
import type { ResponseItem, MessageEvent, MessagePart } from '~/lib/viewer-types'
import type { ResponseItemParsed } from '~/lib/session-parser'

type TimelineEvent = ResponseItem | ResponseItemParsed

interface AnimatedTimelineListProps {
  events: readonly TimelineEvent[]
  className?: string
  onSelect?: (event: TimelineEvent, index: number) => void
}

const SNIPPET_LENGTH = 80

export function AnimatedTimelineList({ events, className, onSelect }: AnimatedTimelineListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const items = useMemo(
    () => events.map((event, index) => renderTimelineItem(event, index, expandedIndex === index)),
    [events, expandedIndex]
  )

  if (!events.length) {
    return <p className="text-sm text-muted-foreground">Load or drop a session to populate the timeline.</p>
  }

  const initialIndex = -1

  return (
    <AnimatedList
      className={`w-full ${className ?? ''}`}
      itemClassName="text-left"
      items={items}
      onItemSelect={(_, index) => {
        const event = events[index]
        if (event) {
          setExpandedIndex((prev) => (prev === index ? null : index))
          onSelect?.(event, index)
        }
      }}
      displayScrollbar={false}
      showGradients={events.length > 6}
      initialSelectedIndex={initialIndex}
    />
  )
}

function renderTimelineItem(event: TimelineEvent, index: number, expanded: boolean) {
  return (
    <div className="space-y-2">
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
        <div className="rounded-lg border border-white/5 bg-black/40 p-3 text-sm text-slate-100">
          {renderEventDetail(event)}
        </div>
      ) : null}
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
          <DetailText value={args} label="Args" />
          <DetailText value={result} label="Result" />
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
          <DetailText value={stdout} label="stdout" />
          <DetailText value={stderr} label="stderr" />
        </div>
      )
    }
    case 'WebSearchCall':
      return event.query ? <DetailText value={event.query} label="Query" /> : <EmptyDetail message="No query string." />
    case 'CustomToolCall': {
      const payload = safeStringify(event.output ?? event.input)
      return payload ? <DetailText value={payload} label="Payload" /> : <EmptyDetail message="No payload." />
    }
    case 'FileChange':
      return event.diff ? <DetailText value={event.diff} label="Diff" /> : <EmptyDetail message="No diff provided." />
    default: {
      const payload = safeStringify(event)
      return payload ? <DetailText value={payload} label="Event" /> : <EmptyDetail message="No additional data." />
    }
  }
}

function DetailText({ value, label }: { value: string; label: string }) {
  if (!value) return null
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <pre className="whitespace-pre-wrap break-words rounded-md bg-white/5 p-2 font-mono text-xs text-white/90">
        {value}
      </pre>
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
