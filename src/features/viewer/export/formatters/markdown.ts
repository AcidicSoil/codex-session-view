import type { ResponseItemParsed } from '~/lib/session-parser'
import { formatTimestampLabel, sanitizeEventPayload } from '../utils'
import type { ExportBuildParams } from '../types'

export function buildMarkdownExport(params: ExportBuildParams) {
  const { scopeResult, options, filterDescription, exportedAt } = params
  const lines: string[] = []
  const exportedAtLabel = (exportedAt ?? new Date()).toLocaleString()
  const scopeLabel = scopeResult.label
  const total = scopeResult.events.length
  lines.push('# Session Export')
  lines.push(`**Date:** ${exportedAtLabel}`)
  lines.push(`**Total Events:** ${total}`)
  lines.push(`**Scope:** ${scopeLabel}`)
  lines.push(`**Filter Applied:** ${filterDescription ?? 'None'}`)
  lines.push('---')
  lines.push('')

  scopeResult.events.forEach((event, idx) => {
    lines.push(renderMarkdownEvent(event, idx, options))
    lines.push('')
  })

  return lines.join('\n').trimEnd()
}

function renderMarkdownEvent(event: ResponseItemParsed, index: number, options: { includeTimestamps: boolean; includeMetadata: boolean }) {
  switch (event.type) {
    case 'Message':
      return renderMessageEvent(event, index, options)
    case 'LocalShellCall':
      return renderShellEvent(event, index, options)
    case 'FunctionCall':
      return renderFunctionCall(event, index, options)
    case 'WebSearchCall':
      return renderSearch(event, index, options)
    case 'CustomToolCall':
      return renderCustomTool(event, index, options)
    case 'FileChange':
      return renderFileChange(event, index, options)
    case 'Reasoning':
      return renderReasoning(event, index, options)
    default:
      return renderOther(event, index, options)
  }
}

function renderMessageEvent(event: Extract<ResponseItemParsed, { type: 'Message' }>, index: number, options: { includeTimestamps: boolean }) {
  const emoji = event.role === 'user' ? '👤' : event.role === 'assistant' ? '🤖' : '💬'
  const timePart = options.includeTimestamps ? formatTimestampSuffix(event.at) : ''
  const header = `## ${emoji} ${capitalize(event.role ?? 'Message')} ${timePart}`.trim()
  const content = normalizeContent(event.content)
  return `${header}\n${content}`
}

function renderShellEvent(event: Extract<ResponseItemParsed, { type: 'LocalShellCall' }>, index: number, options: { includeTimestamps: boolean }) {
  const title = `## 🛠️ Shell Command ${formatTimestampSuffix(options.includeTimestamps ? event.at : undefined)}`
  const duration = event.durationMs != null ? `\n- Duration: ${event.durationMs}ms` : ''
  const status = event.exitCode != null ? `\n- Status: ${event.exitCode === 0 ? 'Success' : `Exit ${event.exitCode}`}` : ''
  const stdout = event.stdout ? `\n\n\`\`\`\n${event.stdout}\n\`\`\`` : ''
  const stderr = event.stderr ? `\n\n**stderr**\n\`\`\`\n${event.stderr}\n\`\`\`` : ''
  return `${title}\n- Command: \`${event.command}\`${duration}${status}${stdout}${stderr}`
}

function renderFunctionCall(event: Extract<ResponseItemParsed, { type: 'FunctionCall' }>, index: number, options: { includeTimestamps: boolean }) {
  const title = `## 🧩 Function Call ${formatTimestampSuffix(options.includeTimestamps ? event.at : undefined)}`
  const args = event.args ? `\n\n**Arguments**\n\`\`\`json\n${JSON.stringify(event.args, null, 2)}\n\`\`\`` : ''
  const result = event.result ? `\n\n**Result**\n\`\`\`json\n${JSON.stringify(event.result, null, 2)}\n\`\`\`` : ''
  return `${title}\n- Name: \`${event.name}\`${args}${result}`
}

function renderSearch(event: Extract<ResponseItemParsed, { type: 'WebSearchCall' }>, index: number, options: { includeTimestamps: boolean }) {
  const title = `## 🌐 Web Search ${formatTimestampSuffix(options.includeTimestamps ? event.at : undefined)}`
  const results = Array.isArray(event.results) && event.results.length
    ? `\n\n${event.results
        .map((r, idx) => `> ${idx + 1}. ${r.title ?? r.url ?? 'Result'}${r.url ? ` — ${r.url}` : ''}${r.snippet ? `\n> ${r.snippet}` : ''}`)
        .join('\n\n')}`
    : ''
  return `${title}\n- Query: \`${event.query}\`${results}`
}

function renderCustomTool(event: Extract<ResponseItemParsed, { type: 'CustomToolCall' }>, index: number, options: { includeTimestamps: boolean }) {
  const title = `## 🧰 Tool Call ${formatTimestampSuffix(options.includeTimestamps ? event.at : undefined)}`
  const input = event.input ? `\n\n**Input**\n\`\`\`json\n${JSON.stringify(event.input, null, 2)}\n\`\`\`` : ''
  const output = event.output ? `\n\n**Output**\n\`\`\`json\n${JSON.stringify(event.output, null, 2)}\n\`\`\`` : ''
  return `${title}\n- Tool: \`${event.toolName}\`${input}${output}`
}

function renderFileChange(event: Extract<ResponseItemParsed, { type: 'FileChange' }>, index: number, options: { includeTimestamps: boolean }) {
  const title = `## 🗂️ File Change ${formatTimestampSuffix(options.includeTimestamps ? event.at : undefined)}`
  const diff = event.diff ? `\n\n\`\`\`diff\n${event.diff}\n\`\`\`` : ''
  return `${title}\n- Path: \`${event.path}\`${diff}`
}

function renderReasoning(event: Extract<ResponseItemParsed, { type: 'Reasoning' }>, index: number, options: { includeTimestamps: boolean }) {
  const title = `## 🧠 Reasoning ${formatTimestampSuffix(options.includeTimestamps ? event.at : undefined)}`
  return `${title}\n${event.content}`
}

function renderOther(event: ResponseItemParsed, index: number, options: { includeTimestamps: boolean }) {
  const title = `## 📦 ${event.type} ${formatTimestampSuffix(options.includeTimestamps ? (event as any).at : undefined)}`
  const payload = sanitizeEventPayload(event, true)
  return `${title}\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``
}

function formatTimestampSuffix(at?: string) {
  if (!at) return ''
  const label = formatTimestampLabel(at)
  return label ? `(${label})` : ''
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

function capitalize(input?: string | null) {
  if (!input) return ''
  return input.slice(0, 1).toUpperCase() + input.slice(1)
}
