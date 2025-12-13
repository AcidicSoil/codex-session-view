import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser'

const METADATA_FIELDS = new Set<string>([
  'id',
  'index',
  'at',
  'model',
  'durationMs',
  'cwd',
  'exitCode',
  'stdoutFormat',
  'stderrFormat',
  'provider',
  'meta',
  'data',
  'rawResponse',
])

export function sanitizeEventPayload<T extends ResponseItemParsed>(event: T, includeMetadata: boolean): T {
  if (includeMetadata) {
    return JSON.parse(JSON.stringify(event)) as T
  }
  const clone = JSON.parse(JSON.stringify(event)) as Record<string, unknown>
  for (const key of Object.keys(clone)) {
    if (METADATA_FIELDS.has(key)) {
      delete clone[key]
    }
  }
  return clone as T
}

export function resolveEventIdentifier(event: ResponseItemParsed, fallbackIndex: number): number {
  if (typeof event.index === 'number' && Number.isFinite(event.index)) {
    return event.index
  }
  return fallbackIndex
}

export function sanitizeSessionMeta(meta?: SessionMetaParsed) {
  if (!meta) return undefined
  const { instructions: _instructions, ...rest } = meta
  return rest
}

export function formatTimestampLabel(at?: string, locale?: string) {
  if (!at) return null
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(locale ?? undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: undefined,
  })
}
