import type { MisalignmentSeverity } from '~/lib/sessions/model'

export interface AgentRule {
  id: string
  heading: string
  level: number
  summary: string
  body: string
  bullets: string[]
  severity: MisalignmentSeverity
  keywords: string[]
}

const HEADING_REGEX = /^(?<hashes>#{1,6})\s+(?<title>.+)$/

export function parseAgentRules(markdown: string): AgentRule[] {
  const lines = markdown.split(/\r?\n/)
  const sections: Array<{ heading: string; level: number; lines: string[] }> = []
  let current: { heading: string; level: number; lines: string[] } | null = null

  for (const line of lines) {
    const headingMatch = line.match(HEADING_REGEX)
    if (headingMatch) {
      if (current) {
        sections.push(current)
      }
      current = {
        heading: headingMatch.groups?.title?.trim() ?? 'Untitled',
        level: headingMatch.groups?.hashes?.length ?? 1,
        lines: [],
      }
      continue
    }
    if (!current) {
      current = { heading: 'Introduction', level: 1, lines: [] }
    }
    current.lines.push(line)
  }
  if (current) {
    sections.push(current)
  }

  const seenIds = new Map<string, number>()
  return sections
    .map((section) => {
      const body = section.lines.join('\n').trim()
      const bullets = section.lines
        .map((line) => line.trim())
        .filter((line) => /^[-*+]|^\d+\./.test(line))
        .map((line) => line.replace(/^[-*+\d\.\s]+/, '').trim())
      const summary = deriveSummaryText(section.lines)
      const severity = inferSeverity(section.heading, body)
      const keywords = deriveKeywords(section.heading, bullets)
      const id = makeSectionId(section.heading, seenIds)
      return {
        id,
        heading: section.heading,
        level: section.level,
        summary,
        body,
        bullets,
        severity,
        keywords,
      }
    })
    .filter((rule) => Boolean(rule.body || rule.summary))
}

function deriveSummaryText(lines: string[]): string {
  for (const raw of lines) {
    const line = raw.trim()
    if (!line || /^[-*+]|^\d+\./.test(line) || line.startsWith('```')) {
      continue
    }
    return line
  }
  return ''
}

function inferSeverity(heading: string, body: string): MisalignmentSeverity {
  const normalized = `${heading}\n${body}`.toLowerCase()
  if (normalized.includes('never') || normalized.includes('do not') || normalized.includes('must not')) {
    return 'high'
  }
  if (normalized.includes('avoid') || normalized.includes('should not')) {
    return 'medium'
  }
  if (normalized.includes('prefers') || normalized.includes('consider')) {
    return 'low'
  }
  if (normalized.includes('warn') || normalized.includes('caution')) {
    return 'medium'
  }
  return 'info'
}

function deriveKeywords(heading: string, bullets: string[]): string[] {
  const source = `${heading} ${bullets.join(' ')}`.toLowerCase()
  return Array.from(
    new Set(
      source
        .split(/[^a-z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 2)
    )
  )
}

function makeSectionId(title: string, seen: Map<string, number>) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^$/, 'section')
  const count = seen.get(base) ?? 0
  seen.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}
