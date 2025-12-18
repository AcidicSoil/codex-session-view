import type { EvidenceContext } from '~/components/chatbot/EvidenceCard'
import type { TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
import type { CoachPrefillPayload } from '~/lib/chatbot/types'
import type { MisalignmentRecord } from '~/lib/sessions/model'
import type { ResponseItemParsed } from '~/lib/session-parser'
import { pickHigherSeverity, selectPrimaryMisalignment } from '~/features/chatbot/severity'

export function deriveSessionId(assetPath: string) {
  const trimmed = assetPath.trim()
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

export function resolveSelectedSessionPath({
  activeSessionId,
  selectedSessionPath,
  sessionIdToAssetPath,
}: {
  activeSessionId: string
  selectedSessionPath: string | null
  sessionIdToAssetPath: Map<string, string>
}): string | null | undefined {
  const selectedId = selectedSessionPath ? deriveSessionId(selectedSessionPath) : null
  if (selectedId === activeSessionId) {
    return undefined
  }
  const matchingPath = sessionIdToAssetPath.get(activeSessionId) ?? null
  if (matchingPath && matchingPath !== selectedSessionPath) {
    return matchingPath
  }
  if (!matchingPath && selectedSessionPath) {
    return null
  }
  return undefined
}

export function buildFlaggedEventMap(misalignments: MisalignmentRecord[]): Map<number, TimelineFlagMarker> {
  const map = new Map<number, TimelineFlagMarker>()
  misalignments.forEach((record) => {
    if (record.status !== 'open') return
    const range = record.eventRange
    if (!range) return
    const start = typeof range.startIndex === 'number' ? range.startIndex : 0
    const end = typeof range.endIndex === 'number' ? range.endIndex : start
    for (let index = start; index <= end; index += 1) {
      const existing = map.get(index)
      if (existing) {
        map.set(index, {
          severity: pickHigherSeverity(existing.severity, record.severity),
          misalignments: [...existing.misalignments, record],
        })
      } else {
        map.set(index, { severity: record.severity, misalignments: [record] })
      }
    }
  })
  return map
}

export function buildRemediationPrefill(records: MisalignmentRecord[]): CoachPrefillPayload | null {
  if (!records.length) {
    return null
  }
  const primary = selectPrimaryMisalignment(records)
  if (!primary) {
    return null
  }
  const range = primary.eventRange
    ? `events ${primary.eventRange.startIndex}-${primary.eventRange.endIndex}`
    : 'the linked events'
  const evidence = primary.evidence?.map((entry) => entry.message).filter(Boolean).join('; ')
  const supporting = records.filter((record) => record.id !== primary.id)
  const supportingLine = supporting.length
    ? `Additional rules involved: ${supporting.map((record) => `${record.ruleId} "${record.title}"`).join(', ')}.`
    : ''
  const prompt =
    [
      `Remediate AGENT rule ${primary.ruleId} "${primary.title}" (${primary.severity}).`,
      `It was flagged around ${range}.`,
      `Summary: ${primary.summary}.`,
      evidence ? `Evidence: ${evidence}.` : null,
      supportingLine || null,
      'Outline concrete steps to resolve these violations and confirm mitigations.',
    ]
      .filter(Boolean)
      .join(' ')

  return {
    prompt,
    metadata: {
      misalignmentId: primary.id,
      ruleId: primary.ruleId,
      severity: primary.severity,
      eventRange: primary.eventRange
        ? { startIndex: primary.eventRange.startIndex, endIndex: primary.eventRange.endIndex }
        : undefined,
    },
  }
}

export function buildEvidenceContext(
  events: ResponseItemParsed[],
  eventIndex: number,
): EvidenceContext | undefined {
  if (!events.length) return undefined
  if (eventIndex < 0 || eventIndex >= events.length) return undefined
  const target = events[eventIndex]
  if (!target || target.type !== 'Message') {
    return undefined
  }
  const context: EvidenceContext = {}
  const text = normalizeMessageContent(target.content)
  if (!text) return undefined
  if (target.role === 'user') {
    context.userMessages = [text]
  } else {
    context.assistantMessages = [text]
  }
  const neighbors = [findNeighborMessage(events, eventIndex - 1, -1), findNeighborMessage(events, eventIndex + 1, 1)]
  neighbors.forEach((neighbor) => {
    if (!neighbor) return
    const neighborText = normalizeMessageContent(neighbor.content)
    if (!neighborText) return
    if (neighbor.role === 'user') {
      context.userMessages = [...(context.userMessages ?? []), neighborText]
    } else {
      context.assistantMessages = [...(context.assistantMessages ?? []), neighborText]
    }
  })
  return context
}

function findNeighborMessage(events: ResponseItemParsed[], start: number, step: number) {
  let pointer = start
  while (pointer >= 0 && pointer < events.length) {
    const candidate = events[pointer]
    if (candidate?.type === 'Message') {
      return candidate
    }
    pointer += step
  }
  return null
}

function normalizeMessageContent(content: ResponseItemParsed['content'] | string | undefined) {
  if (typeof content === 'string') {
    return content.trim()
  }
  if (Array.isArray(content)) {
    return content.map((part) => ('text' in part ? part.text : '')).join('\n').trim()
  }
  return ''
}
