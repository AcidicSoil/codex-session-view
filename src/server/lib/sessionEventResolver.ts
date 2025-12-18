import type { PromptSection } from '~/lib/ai/client'
import type { ChatRemediationMetadata, ChatEventReference, SessionSnapshot } from '~/lib/sessions/model'
import type { ResponseItemParsed } from '~/lib/session-parser'

const EVENT_REFERENCE_REGEX = /#(\d{1,6})\b/g
const MAX_RESOLVED_EVENTS = 8
const MAX_SNIPPET_LENGTH = 1200

export interface ResolvedTimelineEvent {
  event: ResponseItemParsed
  /** Zero-based index */
  eventIndex: number
  /** One-based index exposed to users */
  displayIndex: number
  summary: string
}

export interface ResolveTimelineContextOptions {
  snapshot: SessionSnapshot
  prompt: string
  metadata?: ChatRemediationMetadata
  maxEvents?: number
}

export interface TimelineContextResult {
  resolved: ResolvedTimelineEvent[]
  section: PromptSection | null
  references: ChatEventReference[]
}

export function resolveTimelineContext(options: ResolveTimelineContextOptions): TimelineContextResult {
  const indexes = collectRequestedIndexes(options.prompt, options.metadata)
  if (!indexes.length) {
    return { resolved: [], section: null, references: [] }
  }
  const limit = options.maxEvents ?? MAX_RESOLVED_EVENTS
  const resolved: ResolvedTimelineEvent[] = []
  for (const displayIndex of indexes) {
    if (resolved.length >= limit) break
    const ref = lookupTimelineEvent(options.snapshot, displayIndex)
    if (!ref) continue
    resolved.push(ref)
  }
  if (resolved.length === 0) {
    return { resolved, section: null, references: [] }
  }
  const section: PromptSection = {
    id: 'resolved-events',
    heading: `Resolved timeline references (${resolved.length})`,
    content: resolved.map((entry) => entry.summary).join('\n\n'),
  }
  const references: ChatEventReference[] = resolved.map((entry) => ({
    eventIndex: entry.eventIndex,
    displayIndex: entry.displayIndex,
    eventId: typeof entry.event.id === 'string' ? entry.event.id : undefined,
    eventType: entry.event.type,
    summary: summarizeHeading(entry.event, entry.displayIndex),
  }))
  return { resolved, section, references }
}

function collectRequestedIndexes(prompt: string, metadata?: ChatRemediationMetadata) {
  const indexes = new Set<number>()
  if (prompt) {
    let match: RegExpExecArray | null
    while ((match = EVENT_REFERENCE_REGEX.exec(prompt)) !== null) {
      const numeric = Number.parseInt(match[1], 10)
      if (Number.isFinite(numeric) && numeric > 0) {
        indexes.add(numeric)
      }
    }
  }
  if (metadata?.eventRange) {
    const start = Math.max(1, metadata.eventRange.startIndex + 1)
    const end = Math.max(start, metadata.eventRange.endIndex + 1)
    for (let value = start; value <= end; value += 1) {
      indexes.add(value)
    }
  }
  return [...indexes].sort((a, b) => a - b)
}

function lookupTimelineEvent(snapshot: SessionSnapshot, requestedDisplayIndex: number): ResolvedTimelineEvent | null {
  if (!snapshot.events?.length) {
    return null
  }
  const zeroBased = requestedDisplayIndex - 1
  if (zeroBased < 0 || zeroBased >= snapshot.events.length) {
    return null
  }
  const directIndexMatch = snapshot.events.find((event) => typeof event.index === 'number' && event.index === zeroBased)
  const event = directIndexMatch ?? snapshot.events[zeroBased]
  if (!event) {
    return null
  }
  const normalizedIndex =
    typeof event.index === 'number'
      ? event.index
      : Math.max(
          0,
          Math.min(snapshot.events.length - 1, zeroBased),
        )
  return {
    event,
    eventIndex: normalizedIndex,
    displayIndex: requestedDisplayIndex,
    summary: formatEventSummary(event, normalizedIndex, requestedDisplayIndex),
  }
}

function formatEventSummary(event: ResponseItemParsed, fallbackIndex: number, displayOverride?: number) {
  const displayIndex = displayOverride ?? fallbackIndex + 1
  const heading = summarizeHeading(event, displayIndex)
  const lines: string[] = [heading]
  if (event.at) {
    lines.push(`Timestamp: ${event.at}`)
  }
  switch (event.type) {
    case 'Message': {
      if (event.role) {
        lines.push(`Role: ${event.role}`)
      }
      lines.push(`Content:\n${truncate(extractTextContent(event.content), MAX_SNIPPET_LENGTH)}`)
      break
    }
    case 'LocalShellCall': {
      lines.push(`Command: ${event.command}`)
      if (typeof event.exitCode === 'number') {
        lines.push(`Exit code: ${event.exitCode}`)
      }
      if (event.cwd) {
        lines.push(`cwd: ${event.cwd}`)
      }
      if (event.stdout) {
        lines.push(`stdout:\n${truncate(event.stdout, MAX_SNIPPET_LENGTH)}`)
      }
      if (event.stderr) {
        lines.push(`stderr:\n${truncate(event.stderr, MAX_SNIPPET_LENGTH)}`)
      }
      break
    }
    case 'FunctionCall': {
      lines.push(`Function: ${event.name}`)
      lines.push(`Arguments:\n${truncate(stringifyJson(event.args), MAX_SNIPPET_LENGTH)}`)
      if (event.output) {
        lines.push(`Output:\n${truncate(stringifyJson(event.output), MAX_SNIPPET_LENGTH)}`)
      }
      break
    }
    case 'WebSearchCall':
    case 'CustomToolCall': {
      lines.push(`Tool: ${event.name}`)
      lines.push(`Arguments:\n${truncate(stringifyJson(event.args), MAX_SNIPPET_LENGTH)}`)
      if (event.output) {
        lines.push(`Output:\n${truncate(stringifyJson(event.output), MAX_SNIPPET_LENGTH)}`)
      }
      break
    }
    default: {
      lines.push(`Payload:\n${truncate(stringifyJson(event), MAX_SNIPPET_LENGTH)}`)
      break
    }
  }
  return lines.join('\n')
}

function summarizeHeading(event: ResponseItemParsed, displayIndex: number) {
  const parts = [`Event #${displayIndex}`, event.type]
  if ('role' in event && event.role) {
    parts.push(`(${event.role})`)
  } else if ('name' in event && event.name) {
    parts.push(`(${event.name})`)
  }
  return parts.join(' ')
}

function extractTextContent(content: ResponseItemParsed['content'] | string | undefined) {
  if (!content) return ''
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (entry == null) return ''
        if (typeof entry === 'string') return entry
        if ('text' in entry && typeof entry.text === 'string') return entry.text
        return ''
      })
      .join('\n')
  }
  return stringifyJson(content)
}

function stringifyJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return `${value ?? ''}`
  }
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value
  }
  return `${value.slice(0, maxLength - 3)}...`
}
