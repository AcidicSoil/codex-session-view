import type { MessagePart } from '~/lib/viewer-types/events'
import type { ResponseItemParsed } from './schemas'

export function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

export function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v
  if (v == null) return undefined
  try {
    return JSON.stringify(v)
  } catch {
    return String(v)
  }
}

export function toCamel<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(obj)) {
    const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[ck] = v
  }
  return out as T
}

export function flattenContent(content: unknown): string | undefined
export function flattenContent(content: unknown, preserveArray: false): string | undefined
export function flattenContent(content: unknown, preserveArray: true): string | MessagePart[] | undefined
export function flattenContent(content: unknown, preserveArray = false): string | MessagePart[] | undefined {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const parts: MessagePart[] = []
    for (const b of content) {
      if (b && typeof b === 'object' && 'text' in (b as any)) {
        parts.push({ type: 'text', text: String((b as any).text) })
      } else {
        const text = asString(b)
        if (text != null) parts.push({ type: 'text', text })
      }
    }
    return preserveArray ? parts : parts.map((p) => p.text).join('\n')
  }
  return asString(content)
}

export function extractReasoningContent(src: Record<string, any>): string | null {
  let content = flattenContent(src.content)
  if (typeof content === 'string' && content.trim() !== '') return content
  const summary = flattenContent(src.summary)
  if (typeof summary === 'string' && summary.trim() !== '') return summary
  if ('encryptedContent' in src || 'encrypted_content' in src) return '[encrypted]'
  return null
}

export function tryParseJsonText(s?: string): unknown {
  if (!s) return undefined
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

export function extractMessageFromResponse(resp: any): string | undefined {
  if (!resp || typeof resp !== 'object') return undefined
  if (Array.isArray(resp.output_text) && resp.output_text.length) {
    return resp.output_text
      .map((x: any) => (typeof x === 'string' ? x : asString(x) ?? ''))
      .join('\n')
  }
  if (Array.isArray(resp.output)) {
    const parts: string[] = []
    for (const seg of resp.output) {
      const content =
        seg && typeof seg === 'object' && Array.isArray((seg as any).content)
          ? (seg as any).content
          : null
      if (content) {
        const text = flattenContent(content)
        if (text) parts.push(text)
      }
    }
    if (parts.length) return parts.join('\n')
  }
  return undefined
}

export function annotateCodeLikeOutput(event: ResponseItemParsed): ResponseItemParsed {
  if (event.type !== 'LocalShellCall') {
    return event
  }
  const command = event.command?.toLowerCase() ?? ''
  const stdout = event.stdout ?? ''
  const stderr = event.stderr ?? ''
  const codeLike = isCodeLike(command, stdout) || isCodeLike(command, stderr)
  if (!codeLike) {
    return event
  }
  return {
    ...event,
    stdoutFormat: stdout ? 'code' : event.stdoutFormat,
    stderrFormat: stderr ? 'code' : event.stderrFormat,
  }
}

export function isCodeLike(command: string, output: string): boolean {
  if (!output) return false
  if (command.includes('apply_patch')) return true
  if (command.includes('git diff') || command.includes('diff ')) return true
  if (command.includes('cat ') && /\*\*\* Begin Patch/.test(output)) return true
  if (/^diff --git/m.test(output)) return true
  if (output.startsWith('@@')) return true
  return false
}
