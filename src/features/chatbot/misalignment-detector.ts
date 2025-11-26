import type { AgentRule } from '~/lib/agents-rules/parser'
import { createMisalignmentRecord, type MisalignmentRecord, type SessionSnapshot, type SessionEventRange } from '~/lib/sessions/model'
import type { ResponseItemParsed } from '~/lib/session-parser'

interface MisalignmentDetectorOptions {
  snapshot: SessionSnapshot
  agentRules: AgentRule[]
  existing?: MisalignmentRecord[]
}

export interface MisalignmentDetectorResult {
  misalignments: MisalignmentRecord[]
  warnings: string[]
}

const KEYWORD_HEURISTICS = [
  {
    id: 'useeffect-fetch',
    keywords: ['useeffect', 'fetch'],
    summary: 'Detected fetch call mention inside useEffect context',
    severity: 'high' as const,
    ruleMatcher: /loader|fetch|effect/i,
  },
  {
    id: 'hydration-suspense',
    keywords: ['hydration', 'suspense'],
    summary: 'Hydration and suspense referenced together; ensure transitions wrap updates',
    severity: 'medium' as const,
    ruleMatcher: /hydration|suspense/i,
  },
  {
    id: 'zustand-server-sync',
    keywords: ['zustand', 'server'],
    summary: 'Potential server-synced data stored in Zustand',
    severity: 'medium' as const,
    ruleMatcher: /state|zustand/i,
  },
]

export function detectMisalignments(options: MisalignmentDetectorOptions): MisalignmentDetectorResult {
  const warnings: string[] = []
  const newRecords: MisalignmentRecord[] = []
  const searchableEvents = normalizeEvents(options.snapshot.events)
  for (const heuristic of KEYWORD_HEURISTICS) {
    const matchIndex = findFirstMatch(searchableEvents, heuristic.keywords)
    if (matchIndex === null) {
      continue
    }
    const matchingRule = options.agentRules.find((rule) => heuristic.ruleMatcher.test(rule.heading))
    if (!matchingRule) {
      warnings.push(`No AGENT rule matched heuristic ${heuristic.id}`)
      continue
    }
    if (hasExisting(options.existing, matchingRule.id, heuristic.id)) {
      continue
    }
    const eventRange = deriveEventRange(searchableEvents, matchIndex)
    newRecords.push(
      createMisalignmentRecord({
        sessionId: options.snapshot.sessionId,
        ruleId: matchingRule.id,
        title: matchingRule.heading,
        summary: heuristic.summary,
        severity: heuristic.severity,
        evidence: [
          {
            message: `Matched keywords ${heuristic.keywords.join(', ')}`,
            eventIndex: eventRange?.startIndex,
            eventId: eventRange?.startEventId,
          },
        ],
        eventRange: eventRange ?? undefined,
      }),
    )
  }
  return { misalignments: newRecords, warnings }
}

function normalizeEvents(events: ResponseItemParsed[]): Array<{ index: number; id?: string; text: string }> {
  return events.map((event, index) => ({
    index,
    id: event.id,
    text: stringifyEvent(event).toLowerCase(),
  }))
}

function stringifyEvent(event: ResponseItemParsed) {
  switch (event.type) {
    case 'Message':
      return typeof event.content === 'string' ? event.content : JSON.stringify(event.content)
    case 'Reasoning':
      return event.content
    case 'LocalShellCall':
      return `${event.command} ${event.stdout ?? ''} ${event.stderr ?? ''}`
    case 'FunctionCall':
      return `${event.name} ${JSON.stringify(event.args ?? {})}`
    default:
      return JSON.stringify(event)
  }
}

function findFirstMatch(events: Array<{ index: number; text: string }>, keywords: string[]) {
  for (const event of events) {
    const matches = keywords.every((keyword) => event.text.includes(keyword))
    if (matches) {
      return event.index
    }
  }
  return null
}

function deriveEventRange(events: Array<{ index: number; id?: string }>, index: number): SessionEventRange | null {
  const hit = events.find((event) => event.index === index)
  if (!hit) {
    return null
  }
  const startIndex = Math.max(0, hit.index - 2)
  const endIndex = hit.index + 1
  const startEvent = events.find((event) => event.index === startIndex)
  const endEvent = events.find((event) => event.index === endIndex)
  return {
    startIndex,
    endIndex,
    startEventId: startEvent?.id,
    endEventId: endEvent?.id,
  }
}

function hasExisting(existing: MisalignmentRecord[] | undefined, ruleId: string, key: string) {
  if (!existing) return false
  return existing.some((record) => record.ruleId === ruleId && record.summary.includes(key))
}
