export type JsonParseResult =
  | { success: true; data: unknown }
  | { success: false; error: SyntaxError }

export function tryParseJson(line: string): JsonParseResult {
  let s = line
  s = s.replace(/^\uFEFF/, '')
  s = s.replace(/^\)\]\}'?,?\s*/, '')
  const t = s.trim()
  if (t === '[' || t === ']' || t === '],') {
    return { success: true, data: { __csv_token__: t } }
  }
  try {
    return { success: true, data: JSON.parse(s) }
  } catch (e) {
    if (/[,\s]$/.test(s)) {
      try {
        return { success: true, data: JSON.parse(s.replace(/[\s,]+$/, '')) }
      } catch {}
    }
    return { success: false, error: e as SyntaxError }
  }
}
