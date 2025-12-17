import { ResponseItemSchema, SessionMetaSchema, type ResponseItemParsed, type SessionMetaParsed } from './schemas'
import { ensureEventOrigin } from '../session-origin'

type UnknownRecord = Record<string, unknown>

const TOOL_CLASSIFICATIONS: Record<string, 'shell' | 'web-search' | 'web-fetch' | 'other'> = {
  bash: 'shell',
  shell: 'shell',
  sh: 'shell',
  command: 'shell',
  google_web_search: 'web-search',
  web_search: 'web-search',
  googlesearch: 'web-search',
  google_search: 'web-search',
  webfetch: 'web-fetch',
  web_fetch: 'web-fetch',
}

const GEMINI_JSON_MAX_BYTES = 5 * 1024 * 1024 // 5MB cap aligns with ~100 turns guidance

export interface GeminiConversationParseResult {
  meta: SessionMetaParsed
  events: ResponseItemParsed[]
}

export function normalizeGeminiMetaPayload(payload: UnknownRecord): SessionMetaParsed | null {
  const typeField = pickType(payload)
  if (typeField !== 'init') return null
  const timestamp = asString(payload.timestamp) ?? new Date().toISOString()
  const id = asString(payload.session_id ?? payload.sessionId)
  const version = asString(payload.model) ?? 'gemini-cli'
  const candidate = { id, timestamp, version, origin: 'gemini-cli' }
  const parsed = SessionMetaSchema.safeParse(candidate)
  return parsed.success ? parsed.data : null
}

export function normalizeGeminiEventShape(original: UnknownRecord, camel: UnknownRecord): UnknownRecord | null {
  const typeField = pickType(original)
  if (!typeField) return null
  switch (typeField) {
    case 'tool_use':
      return normalizeGeminiToolUse(original)
    case 'tool_result':
      return normalizeGeminiToolResult(original)
    case 'message':
      return normalizeGeminiMessage(original)
    case 'thought':
    case 'reasoning':
      return normalizeGeminiThought(original)
    case 'result':
    case 'error':
      return {
        type: 'Other',
        data: original,
        id: asString(original.id),
        at: asString(original.timestamp ?? camel.at),
        origin: 'gemini-cli',
      }
    default:
      return null
  }
}

export async function tryParseGeminiConversationBlob(
  blob: Blob,
  opts: { maxBytes?: number } = {},
): Promise<GeminiConversationParseResult | null> {
  const limit = opts.maxBytes ?? GEMINI_JSON_MAX_BYTES
  if (blob.size > limit) return null
  const text = await blob.text()
  const trimmed = text.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return null
  }
  const conversation = attemptConversationRecord(parsed)
  if (conversation) return conversation
  const checkpoint = attemptCheckpointRecord(parsed)
  if (checkpoint) return checkpoint
  return null
}

function attemptConversationRecord(source: unknown): GeminiConversationParseResult | null {
  if (!isRecord(source) || !Array.isArray(source.messages)) return null
  const timestamp = asString(source.startTime) ?? inferTimestampFromMessages(source.messages) ?? new Date().toISOString()
  const metaValue = {
    id: asString(source.sessionId),
    timestamp,
    version: 'gemini-cli',
    origin: 'gemini-cli',
  }
  const metaParsed = SessionMetaSchema.safeParse(metaValue)
  if (!metaParsed.success) return null
  const events: ResponseItemParsed[] = []
  for (const message of source.messages) {
    if (!isRecord(message)) continue
    const role = deriveRoleFromMessageType(asString(message.type))
    const content = flattenContent(message.content)
    if (content) {
        const evt: UnknownRecord = {
          type: 'Message',
          role,
          content,
          model: asString(message.model),
          id: asString(message.id),
          at: asString(message.timestamp),
          origin: 'gemini-cli',
        }
      const parsedEvent = ResponseItemSchema.safeParse(evt)
      if (parsedEvent.success) events.push(parsedEvent.data)
    }
    if (Array.isArray(message.thoughts)) {
      for (const thought of message.thoughts) {
        if (!isRecord(thought)) continue
        const contentText = buildThoughtText(thought)
        if (!contentText) continue
        const thoughtEvent = ResponseItemSchema.safeParse({
          type: 'Reasoning',
          content: contentText,
          id: asString(thought.id),
          at: asString(thought.timestamp ?? message.timestamp),
          origin: 'gemini-cli',
        })
        if (thoughtEvent.success) events.push(thoughtEvent.data)
      }
    }
    if (Array.isArray(message.toolCalls)) {
      for (const toolCall of message.toolCalls) {
        if (!isRecord(toolCall)) continue
        const normalized = normalizeConversationToolCall(toolCall, asString(message.timestamp))
        if (normalized) events.push(normalized)
      }
    }
  }
  return { meta: metaParsed.data, events }
}

function attemptCheckpointRecord(source: unknown): GeminiConversationParseResult | null {
  if (!source) return null
  const history = Array.isArray(source)
    ? source
    : isRecord(source) && Array.isArray(source.history)
      ? source.history
      : null
  if (!history) return null
  const metaParsed = SessionMetaSchema.safeParse({
    timestamp: new Date().toISOString(),
    version: 'gemini-checkpoint',
    origin: 'gemini-cli',
  })
  if (!metaParsed.success) return null
  const events: ResponseItemParsed[] = []
  for (const entry of history) {
    if (!isRecord(entry)) continue
    const role = typeof entry.role === 'string' ? entry.role : 'assistant'
    const content = flattenContent(entry.parts ?? entry.content ?? entry.text)
    if (!content) continue
    const message = ResponseItemSchema.safeParse({
      type: 'Message',
      role,
      content,
      id: asString(entry.id),
      at: asString(entry.timestamp),
      origin: 'gemini-cli',
    })
    if (message.success) events.push(message.data)
  }
  return { meta: metaParsed.data, events }
}

function normalizeConversationToolCall(call: UnknownRecord, fallbackTimestamp?: string) {
  const base: UnknownRecord = {
    type: 'tool_use',
    tool_name: call.name,
    tool_id: call.id,
    parameters: call.args,
    timestamp: call.timestamp ?? fallbackTimestamp,
  }
  const normalizedCall = normalizeGeminiToolUse(base)
  if (!normalizedCall) return null
  const enriched = { ...normalizedCall }
  if (call.result !== undefined) {
    const resultPayload: UnknownRecord = {
      type: 'tool_result',
      tool_name: call.name,
      tool_id: call.id,
      output: call.result,
      timestamp: call.timestamp ?? fallbackTimestamp,
      origin: 'gemini-cli',
    }
    const normalizedResult = normalizeGeminiToolResult(resultPayload)
    mergeResultIntoCall(enriched, normalizedResult)
  }
  const parsed = ResponseItemSchema.safeParse(enriched)
  return parsed.success ? parsed.data : null
}

function mergeResultIntoCall(target: UnknownRecord, result: UnknownRecord | null) {
  if (!result) return
  if (target.type === 'LocalShellCall') {
    if (typeof result.stdout === 'string') target.stdout = result.stdout
    if (typeof result.stderr === 'string') target.stderr = result.stderr
    if (typeof result.exitCode === 'number') target.exitCode = result.exitCode
    if (typeof result.durationMs === 'number') target.durationMs = result.durationMs
  } else if (target.type === 'FunctionCall' && 'result' in result) {
    target.result = (result as any).result
    if (result.durationMs !== undefined) target.durationMs = result.durationMs
  }
}

function normalizeGeminiToolUse(payload: UnknownRecord): UnknownRecord | null {
  const toolNameRaw = asString(payload.tool_name ?? payload.toolName ?? payload.name)
  const toolName = toolNameRaw ?? 'tool'
  const callId = asString(payload.tool_id ?? payload.toolId ?? payload.id)
  const timestamp = asString(payload.timestamp)
  const argsRaw = payload.parameters ?? payload.args ?? payload.arguments
  const args = typeof argsRaw === 'string' ? tryParseJson(argsRaw) : argsRaw
  const classification = classifyTool(toolName)
  if (classification === 'shell') {
    const command = asString((args as any)?.command) ?? ''
    const cwd = asString((args as any)?.cwd)
    return {
      type: 'LocalShellCall',
      command,
      cwd,
      call_id: callId,
      id: callId,
      at: timestamp,
      origin: 'gemini-cli',
    }
  }
  if (classification === 'web-search') {
    return {
      type: 'WebSearchCall',
      query: asString((args as any)?.query) ?? '',
      provider: 'google',
      call_id: callId,
      id: callId,
      at: timestamp,
      origin: 'gemini-cli',
    }
  }
  return {
    type: 'FunctionCall',
    name: toolName,
    args,
    call_id: callId,
    id: callId,
    at: timestamp,
    origin: 'gemini-cli',
  }
}

function normalizeGeminiToolResult(payload: UnknownRecord): UnknownRecord | null {
  const toolNameRaw = asString(payload.tool_name ?? payload.toolName ?? payload.name)
  const toolName = toolNameRaw ?? 'tool'
  const callId = asString(payload.tool_id ?? payload.toolId ?? payload.id)
  const outputRaw = payload.output ?? payload.result
  const output = typeof outputRaw === 'string' ? tryParseJson(outputRaw) : outputRaw
  const classification = classifyTool(toolName)
  if (classification === 'shell') {
    const stdout = asString((output as any)?.stdout ?? output)
    const stderr = asString((output as any)?.stderr)
    const exitCode = extractNumber((output as any)?.exitCode ?? (output as any)?.exit_code)
    const durationMs = extractNumber((output as any)?.durationMs ?? (output as any)?.duration_ms)
    const command = asString((output as any)?.command)
    return {
      type: 'LocalShellCall',
      stdout,
      stderr,
      exitCode,
      durationMs,
      command,
      call_id: callId,
      id: callId,
      at: asString(payload.timestamp),
      origin: 'gemini-cli',
    }
  }
  if (classification === 'web-search') {
    const results = Array.isArray((output as any)?.results) ? (output as any).results : undefined
    const mappedResults = results?.map((item: any) => ({
      title: asString(item?.title),
      url: asString(item?.url),
      snippet: asString(item?.snippet ?? item?.summary),
    }))
    return {
      type: 'WebSearchCall',
      query: asString((output as any)?.query) ?? '',
      provider: asString((output as any)?.provider) ?? 'google',
      results: mappedResults,
      call_id: callId,
      id: callId,
      at: asString(payload.timestamp),
      origin: 'gemini-cli',
    }
  }
  return {
    type: 'FunctionCall',
    name: toolName,
    result: output,
    call_id: callId,
    id: callId,
    at: asString(payload.timestamp),
    origin: 'gemini-cli',
  }
}

function normalizeGeminiMessage(payload: UnknownRecord): UnknownRecord | null {
  const content = flattenContent(payload.content ?? payload.delta ?? payload.text)
  if (!content) return null
  const role = typeof payload.role === 'string' ? payload.role : 'assistant'
  return {
    type: 'Message',
    role,
    content,
    id: asString(payload.id),
    at: asString(payload.timestamp),
    model: asString(payload.model),
    origin: 'gemini-cli',
  }
}

function normalizeGeminiThought(payload: UnknownRecord): UnknownRecord | null {
  const summary = flattenContent(payload.description ?? payload.text ?? payload.summary)
  if (!summary) return null
  return {
    type: 'Reasoning',
    content: summary,
    id: asString(payload.id),
    at: asString(payload.timestamp),
    origin: 'gemini-cli',
  }
}

function flattenContent(content: unknown): string | undefined {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const parts = content
      .map((item) => {
        if (!item) return null
        if (typeof item === 'string') return item
        if (typeof item === 'object' && 'text' in item && typeof (item as any).text === 'string') {
          return (item as any).text as string
        }
        return null
      })
      .filter((value): value is string => !!value)
    return parts.length ? parts.join('\n') : undefined
  }
  if (isRecord(content) && Array.isArray(content.parts)) {
    return flattenContent(content.parts)
  }
  return undefined
}

function buildThoughtText(thought: UnknownRecord) {
  const subject = asString(thought.subject)
  const description = flattenContent(thought.description ?? thought.text)
  if (subject && description) return `${subject}: ${description}`
  return description ?? subject ?? undefined
}

function classifyTool(toolName: string) {
  const normalized = toolName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
  return TOOL_CLASSIFICATIONS[normalized] ?? 'other'
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function extractNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  return undefined
}

function pickType(record: UnknownRecord): string | undefined {
  const raw = record?.type ?? record?.event ?? record?.kind
  return typeof raw === 'string' ? raw.toLowerCase().replace(/[-\s]+/g, '_') : undefined
}

function deriveRoleFromMessageType(type?: string | null) {
  if (!type) return 'assistant'
  const normalized = type.toLowerCase()
  if (normalized === 'user') return 'user'
  if (normalized === 'gemini' || normalized === 'assistant') return 'assistant'
  return 'system'
}

function inferTimestampFromMessages(messages: unknown[]) {
  for (const entry of messages) {
    if (isRecord(entry) && typeof entry.timestamp === 'string') return entry.timestamp
  }
  return undefined
}

function asString(value: unknown) {
  if (typeof value === 'string') return value
  return undefined
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
