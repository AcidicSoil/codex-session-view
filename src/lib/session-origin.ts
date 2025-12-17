export const SESSION_ORIGINS = ['codex', 'gemini-cli'] as const
export type SessionOrigin = (typeof SESSION_ORIGINS)[number]

const ORIGIN_LABELS: Record<SessionOrigin, string> = {
  codex: 'Codex',
  'gemini-cli': 'Gemini CLI',
}

const GEMINI_INIT_REGEX = /"type"\s*:\s*"init"/i
const GEMINI_SESSION_FIELDS = [/"sessionId"/i, /"projectHash"/i]
const GEMINI_TOOL_FIELDS = [/"tool_use"/i, /"tool_result"/i]
const MAX_SCAN_LENGTH = 8000

export interface DetectSessionOriginOptions {
  defaultOrigin?: SessionOrigin
}

export function getSessionOriginLabel(origin: SessionOrigin): string {
  return ORIGIN_LABELS[origin] ?? origin
}

export function detectSessionOriginFromContent(
  content?: string | null,
  options: DetectSessionOriginOptions = {},
): SessionOrigin | undefined {
  if (!content) return options.defaultOrigin
  const head = content.slice(0, MAX_SCAN_LENGTH)
  if (GEMINI_INIT_REGEX.test(head)) return 'gemini-cli'
  if (GEMINI_SESSION_FIELDS.every((regex) => regex.test(head))) return 'gemini-cli'
  if (GEMINI_TOOL_FIELDS.every((regex) => regex.test(head))) return 'gemini-cli'
  return options.defaultOrigin ?? 'codex'
}

export function ensureEventOrigin<T extends { origin?: SessionOrigin }>(event: T, origin?: SessionOrigin): T {
  if (!event.origin && origin) {
    (event as T & { origin: SessionOrigin }).origin = origin
  }
  return event
}
