import type { ResponseItemParsed } from '~/lib/session-parser'
import type { ExportBuildParams } from '../types'
import { formatTimestampLabel, sanitizeEventPayload } from '../utils'

export function buildTextExport(params: ExportBuildParams) {
  const { scopeResult, options, filterDescription, exportedAt } = params
  const lines: string[] = []
  const exportedAtLabel = (exportedAt ?? new Date()).toLocaleString()
  lines.push(`Session Export (${scopeResult.label})`)
  lines.push(`Generated: ${exportedAtLabel}`)
  lines.push(`Filter: ${filterDescription ?? 'None'}`)
  lines.push(`Events: ${scopeResult.events.length}`)
  lines.push('---')
  scopeResult.events.forEach((event, index) => {
    lines.push(renderTextEvent(event, index, options.includeTimestamps))
    lines.push('---')
  })
  return lines.join('\n')
}

function renderTextEvent(event: ResponseItemParsed, index: number, includeTimestamp: boolean) {
  const parts: string[] = []
  const label = `Event ${index + 1} - ${event.type}`
  const timeLabel = includeTimestamp ? formatTimestampLabel((event as any).at) : null
  parts.push(timeLabel ? `${label} (${timeLabel})` : label)
  if (event.type === 'Message') {
    parts.push(`Role: ${event.role ?? 'unknown'}`)
    parts.push('Content:')
    parts.push(normalizeContent(event.content))
  } else {
    parts.push(JSON.stringify(sanitizeEventPayload(event, true), null, 2))
  }
  return parts.join('\n')
}

function normalizeContent(content: ResponseItemParsed['content']) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (typeof part?.text === 'string') return part.text
        return ''
      })
      .join('')
  }
  return ''
}
