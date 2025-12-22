export function deriveSessionIdFromPath(path: string) {
  const trimmed = path.trim()
  if (!trimmed) return 'session-unbound'
  if (typeof TextEncoder !== 'undefined') {
    const encoder = new TextEncoder()
    const bytes = encoder.encode(trimmed)
    let hex = ''
    for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, '0')
      if (hex.length >= 40) break
    }
    if (hex) {
      return `session-${hex}`
    }
  }
  const slug = trimmed.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return slug ? `session-${slug}` : 'session-unbound'
}

export function deriveSessionIdFromAssetPath(assetPath: string) {
  return deriveSessionIdFromPath(assetPath)
}
