export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const TOKEN_PATTERN = /\/(?:\\.|[^/])+\/[a-z]*|[^\s]+/gi
const MAX_TOKENS = 8

export interface SearchMatcher {
  pattern: string
  flags: string
  raw: string
  isRegex: boolean
}

export function createSearchMatcher(query?: string | null) {
  const matchers = buildSearchMatchers(query)
  if (!matchers.length) return null
  const matcher = matchers[0]
  const flags = ensureFlag(matcher.flags, 'g')
  return new RegExp(matcher.pattern, flags)
}

export function buildSearchMatchers(query?: string | null): SearchMatcher[] {
  const normalized = typeof query === 'string' ? query.trim() : ''
  if (!normalized) return []
  const tokens: string[] = []
  const matches = normalized.match(TOKEN_PATTERN) ?? []
  for (const token of matches) {
    if (!token) continue
    tokens.push(token)
    if (tokens.length >= MAX_TOKENS) break
  }
  return tokens
    .map((token) => toSearchMatcher(token))
    .filter((matcher): matcher is SearchMatcher => matcher !== null)
}

function toSearchMatcher(token: string): SearchMatcher | null {
  if (token.startsWith('/') && token.indexOf('/', 1) !== -1) {
    const lastSlash = token.lastIndexOf('/')
    if (lastSlash <= 1) {
      return null
    }
    const pattern = token.slice(1, lastSlash)
    const tail = token.slice(lastSlash + 1)
    const userFlags = tail.replace(/[^a-z]/gi, '')
    const flags = dedupeFlags(ensureCaseInsensitive(userFlags))
    try {
      new RegExp(pattern, ensureFlag(flags, 'g'))
      return {
        pattern,
        flags,
        raw: token,
        isRegex: true,
      }
    } catch {
      return null
    }
  }
  const pattern = escapeRegExp(token)
  const flags = 'i'
  try {
    new RegExp(pattern, ensureFlag(flags, 'g'))
    return {
      pattern,
      flags,
      raw: token,
      isRegex: false,
    }
  } catch {
    return null
  }
}

function dedupeFlags(flags: string) {
  return Array.from(new Set(flags.split('').filter(Boolean))).join('')
}

function ensureFlag(flags: string, flag: string) {
  return flags.includes(flag) ? flags : `${flags}${flag}`
}

function ensureCaseInsensitive(flags: string) {
  return flags.includes('i') ? flags : `${flags}i`
}

export function matchesSearchMatchers(text: string, matchers: SearchMatcher[]): boolean {
  if (!matchers.length) return true
  const target = text ?? ''
  return matchers.every((matcher) => {
    const regex = new RegExp(matcher.pattern, matcher.flags)
    return regex.test(target)
  })
}

export function findHighlightRanges(
  text: string,
  matchers: SearchMatcher[],
  options?: { maxMatches?: number },
) {
  if (!matchers.length || !text) return [] as Array<{ start: number; end: number }>
  const limit = options?.maxMatches ?? 200
  const ranges: Array<{ start: number; end: number }> = []
  for (const matcher of matchers) {
    const regex = new RegExp(matcher.pattern, ensureFlag(matcher.flags, 'g'))
    let match: RegExpExecArray | null
    let guard = 0
    while ((match = regex.exec(text))) {
      if (ranges.length >= limit) {
        return mergeRanges(ranges)
      }
      const start = match.index
      const end = regex.lastIndex
      if (start === end) {
        regex.lastIndex += 1
        continue
      }
      ranges.push({ start, end })
      guard += 1
      if (guard > 4000) {
        break
      }
    }
  }
  return mergeRanges(ranges)
}

function mergeRanges(ranges: Array<{ start: number; end: number }>) {
  if (ranges.length <= 1) return ranges
  const sorted = ranges.sort((a, b) => a.start - b.start)
  const merged: typeof ranges = []
  let current = sorted[0]
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i]
    if (next.start <= current.end) {
      current = { start: current.start, end: Math.max(current.end, next.end) }
    } else {
      merged.push(current)
      current = next
    }
  }
  merged.push(current)
  return merged
}

