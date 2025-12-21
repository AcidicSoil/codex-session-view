import { type ZodError } from 'zod'
import {
  SessionMetaSchema,
  ResponseItemSchema,
  type SessionMetaParsed,
  type ResponseItemParsed,
} from './schemas'
import {
  normalizeGeminiEventShape,
  normalizeGeminiMetaPayload,
} from './gemini'
import { tryParseJson } from './validatorJson'
import { annotateCodeLikeOutput, isRecord, toCamel } from './validatorHelpers'
import { normalizeForeignEventShape } from './validatorNormalize'

export type ParseFailureReason = 'invalid_json' | 'invalid_schema'

export type SafeResult<T> =
  | { success: true; data: T }
  | { success: false; error: ZodError | SyntaxError; reason: ParseFailureReason }

// helpers moved to validator modules

export function parseSessionMetaLine(line: string): SafeResult<SessionMetaParsed> {
  const j = tryParseJson(line)
  if (!j.success) return { success: false, error: j.error, reason: 'invalid_json' }
  let payload: unknown = j.data
  // Unwrap common wrappers like { record_type: 'meta', record: { ... } }
  if (isRecord(payload)) {
    const rt = (payload as any).record_type || (payload as any).recordType
    if (typeof rt === 'string' && rt.toLowerCase() === 'meta') {
      const inner = (payload as any).record || (payload as any).data || (payload as any).payload
      if (inner && typeof inner === 'object') payload = inner
    }
    // Also support exporters that use { type: 'session_meta', payload: { ... } }
    const t = (payload as any).type
    if (typeof t === 'string' && t.toLowerCase() === 'session_meta') {
      const inner = (payload as any).payload || (payload as any).data || (payload as any).record
      if (inner && typeof inner === 'object') payload = inner
    }
  }
  if (isRecord(payload)) {
    const geminiMeta = normalizeGeminiMetaPayload(payload)
    if (geminiMeta) return { success: true, data: geminiMeta }
  }
  const res = SessionMetaSchema.safeParse(payload)
  if (!res.success) return { success: false, error: res.error, reason: 'invalid_schema' }
  return { success: true, data: res.data }
}

export function parseResponseItemLine(line: string): SafeResult<ResponseItemParsed> {
  const j = tryParseJson(line)
  if (!j.success) return { success: false, error: j.error, reason: 'invalid_json' }

  // Unwrap foreign wrappers first (e.g., { record_type: 'event', record: { ... } })
  let payload: unknown = j.data
  if (isRecord(payload)) {
    const rt = (payload as any).record_type || (payload as any).recordType
    if (typeof rt === 'string') {
      const rtl = rt.toLowerCase()
      if (rtl === 'event' || rtl === 'trace' || rtl === 'log' || rtl === 'response') {
        const inner = (payload as any).record || (payload as any).event || (payload as any).payload || (payload as any).data || (payload as any).item
        if (inner && typeof inner === 'object') payload = inner
      } else if (rtl === 'state') {
        // Let caller decide to skip state; represent as Other here for resilience
        const fallback = { type: 'Other', data: payload }
        const alt = ResponseItemSchema.safeParse(fallback)
        if (alt.success) return { success: true, data: alt.data }
      }
    }
    // Unwrap Codex CLI style wrappers: { type: 'response_item'|'event_msg', payload: { ... } }
    const t = (payload as any).type
    if (typeof t === 'string') {
      const tl = t.toLowerCase()
      if (tl === 'response_item' || tl === 'event_msg' || tl === 'event') {
        const inner = (payload as any).payload || (payload as any).data || (payload as any).record || (payload as any).event || (payload as any).item
        if (inner && typeof inner === 'object') {
          // Propagate timestamp if present
          if (typeof (payload as any).timestamp === 'string' && !(inner as any).at) (inner as any).at = (payload as any).timestamp
          payload = inner
        }
      }
    }
  }

  // Try normalization of foreign event shapes (lowercase types, nested payloads, snake_case)
  if (isRecord(payload)) {
    const normalized = normalizeForeignEventShape(payload)
    if (normalized) {
      const normRes = ResponseItemSchema.safeParse(normalized)
      if (normRes.success) return { success: true, data: normRes.data }
    }

    const camel = toCamel(payload)
    const geminiNormalized = normalizeGeminiEventShape(payload, camel)
    if (geminiNormalized) {
      const geminiRes = ResponseItemSchema.safeParse(geminiNormalized)
      if (geminiRes.success) {
        return { success: true, data: annotateCodeLikeOutput(geminiRes.data) }
      }
    }
  }

  // Fallback: strict schema as-is
  const res = ResponseItemSchema.safeParse(payload)
  if (res.success) {
    return { success: true, data: annotateCodeLikeOutput(res.data) }
  }

  // Fallback: if discriminator is unknown/missing, coerce to Other-event to avoid hard failure
  // Preserve base fields when available, and tuck the original payload under `data`.
  if (isRecord(payload)) {
    const base = payload
    const t = typeof (base as any).type === 'string' ? (base as any).type : undefined
    const known = [
      'Message',
      'Reasoning',
      'FunctionCall',
      'LocalShellCall',
      'WebSearchCall',
      'CustomToolCall',
      'FileChange',
      'Other',
    ]
    // Only coerce to Other when type is missing or unknown
    if (!t || !known.includes(t)) {
      const fallback = {
        type: 'Other',
        id: typeof base.id === 'string' ? base.id : undefined,
        at: typeof base.at === 'string' ? base.at : undefined,
        index: typeof base.index === 'number' ? base.index : undefined,
        data: base,
      }
      const alt = ResponseItemSchema.safeParse(fallback)
      if (alt.success) return { success: true, data: annotateCodeLikeOutput(alt.data) }
    }
  }

  return { success: false, error: res.error, reason: 'invalid_schema' }
}
