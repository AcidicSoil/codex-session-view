import type { TimelineEvent } from './types'
import type { MessageEvent, MessagePart } from '~/lib/viewer-types'
import { formatLogTimestamp } from '~/utils/log-timestamp'
import { truncateRuleTitle } from '~/lib/agents-rules/format'
import { toSeverityLabel } from '~/features/chatbot/severity'
import type { TimelineFlagMarker } from './types'
import { extractCommandMetadata } from '~/lib/session-events/toolMetadata'

export const SNIPPET_LENGTH = 100

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

export function buildEventSignature(event: TimelineEvent) {
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

export function buildLabel(event: TimelineEvent, displayNumber: number) {
  const prefix = `#${displayNumber}`
  const summary = summarizeEvent(event)
  return `${prefix} — ${summary}`
}

export function summarizeEvent(event: TimelineEvent) {
  switch (event.type) {
    case 'Message':
      return `${capitalize(event.role ?? 'message')}: ${truncate(extractMessageText(event.content))}`
    case 'Reasoning':
      return `Reasoning: ${truncate(event.content ?? '')}`
    case 'FunctionCall':
      if (isShellCommandFunctionCall(event)) {
        const meta = extractCommandMetadata(event)
        const commandLabel = meta.commandToken ?? meta.commandText
        return commandLabel ? `Shell ${commandLabel}` : 'Shell command'
      }
      return `Function ${event.name ?? 'call'}${event.durationMs ? ` (${event.durationMs}ms)` : ''}`
    case 'LocalShellCall':
      return summarizeCommand(event.command ?? event.stdout ?? event.stderr)
        ? `Shell ${summarizeCommand(event.command ?? event.stdout ?? event.stderr)}`
        : 'Shell call'
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

export function buildMetaLine(event: TimelineEvent) {
  switch (event.type) {
    case 'Message':
      return [capitalize(event.role ?? 'message'), event.model].filter(Boolean).join(' · ') || 'Message'
    case 'FunctionCall': {
      if (isShellCommandFunctionCall(event)) {
        const meta = extractCommandMetadata(event)
        const command = meta.commandText ?? meta.commandToken ?? event.name
        return [command, event.durationMs ? `${event.durationMs}ms` : null].filter(Boolean).join(' · ')
      }
      return [event.name, event.durationMs ? `${event.durationMs}ms` : null].filter(Boolean).join(' · ') || 'Function call'
    }
    case 'LocalShellCall':
      return [summarizeCommand(event.command), typeof event.exitCode === 'number' ? `exit ${event.exitCode}` : null]
        .filter(Boolean)
        .join(' · ')
    case 'WebSearchCall':
      return event.query ?? 'Search'
    case 'FileChange':
      return event.path ?? 'File change'
    case 'CustomToolCall':
      return event.toolName ?? 'Tool call'
    default:
      return (event.at && formatLogTimestamp(event.at, { fallback: 'Event', style: 'datetime' })) || 'Event'
  }
}

export function formatMisalignmentTooltip(marker: TimelineFlagMarker) {
  const severityLabel = toSeverityLabel(marker.severity)
  const entries = marker.misalignments
    .map((record) => `${record.ruleId.toUpperCase()} “${truncateRuleTitle(record.title)}”`)
    .join(', ')
  return `${severityLabel} severity: ${entries}`
}

export function extractMessageText(content: MessageEvent['content'] | undefined) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : ((part as MessagePart).text ?? '')))
      .join(' ')
  }
  return ''
}

export function summarizeCommand(value?: string | null, limit = 72) {
  if (!value) return ''
  const firstLine = value.split('\n').find((line) => line.trim().length > 0)
  const trimmed = (firstLine ?? value).trim()
  return truncate(trimmed, limit)
}

export function truncate(value: string, limit = SNIPPET_LENGTH) {
  if (!value) return ''
  return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

export function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : ''
}

export function safeStringify(value: unknown) {
  if (value == null) return ''
  try {
    if (typeof value === 'string') return value
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function isShellCommandFunctionCall(
  event: TimelineEvent,
): event is Extract<TimelineEvent, { type: 'FunctionCall' }> {
  if (event.type !== 'FunctionCall' || typeof event.name !== 'string') return false
  const normalized = event.name.trim().toLowerCase()
  return normalized === 'shell_command' || normalized === 'shellcommand'
}
