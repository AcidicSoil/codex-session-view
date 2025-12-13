import type { ResponseItemParsed } from '~/lib/session-parser'
import type { ExportBuildParams } from '../types'
import { resolveEventIdentifier } from '../utils'

const HEADERS = ['Timestamp', 'Event ID', 'Role', 'Type', 'Command/Tool', 'Content', 'Duration (ms)', 'Status'] as const

export function buildCsvExport(params: ExportBuildParams) {
  const { scopeResult, options } = params
  const rows = [HEADERS.join(',')]
  scopeResult.events.forEach((event, index) => {
    const row = [
      formatTimestamp(options.includeTimestamps ? (event as any).at : undefined),
      formatEventId(event, index, options.includeMetadata),
      formatRole(event),
      event.type,
      formatCommand(event),
      sanitizeCsvValue(extractContent(event)),
      formatDuration(event),
      formatStatus(event),
    ].map(escapeCsvValue)
    rows.push(row.join(','))
  })
  return rows.join('\n')
}

function formatTimestamp(at?: string) {
  if (!at) return ''
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString()
}

function formatEventId(event: ResponseItemParsed, fallback: number, includeMetadata: boolean) {
  if (!includeMetadata) return ''
  return String(event.id ?? resolveEventIdentifier(event, fallback))
}

function formatRole(event: ResponseItemParsed) {
  if (event.type === 'Message') {
    return event.role ?? ''
  }
  return ''
}

function formatCommand(event: ResponseItemParsed) {
  switch (event.type) {
    case 'FunctionCall':
      return event.name
    case 'LocalShellCall':
      return event.command
    case 'WebSearchCall':
      return event.query
    case 'CustomToolCall':
      return event.toolName
    default:
      return ''
  }
}

function extractContent(event: ResponseItemParsed) {
  switch (event.type) {
    case 'Message':
      return typeof event.content === 'string'
        ? event.content
        : Array.isArray(event.content)
          ? event.content
              .map((part) =>
                typeof part === 'string'
                  ? part
                  : typeof part?.text === 'string'
                    ? part.text
                    : '',
              )
              .join('')
          : ''
    case 'FunctionCall':
      return event.result ? JSON.stringify(event.result) : event.args ? JSON.stringify(event.args) : ''
    case 'LocalShellCall':
      return event.stdout ?? event.stderr ?? ''
    case 'WebSearchCall':
      return event.results ? JSON.stringify(event.results) : ''
    case 'CustomToolCall':
      return event.output ? JSON.stringify(event.output) : ''
    case 'FileChange':
      return event.diff ?? ''
    case 'Reasoning':
      return event.content
    default:
      return JSON.stringify(event)
  }
}

function formatDuration(event: ResponseItemParsed) {
  if ('durationMs' in event && typeof (event as any).durationMs === 'number') {
    return String((event as any).durationMs)
  }
  return ''
}

function formatStatus(event: ResponseItemParsed) {
  if (event.type === 'LocalShellCall') {
    if (typeof event.exitCode === 'number') {
      return event.exitCode === 0 ? 'Success' : `Exit ${event.exitCode}`
    }
  }
  return ''
}

function sanitizeCsvValue(value: string) {
  if (!value) return ''
  const dangerousPrefixes = ['=', '+', '-', '@']
  if (dangerousPrefixes.some((prefix) => value.startsWith(prefix))) {
    return `'${value}`
  }
  return value
}

function escapeCsvValue(value: string) {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
