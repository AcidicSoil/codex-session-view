import { tool } from 'ai'
import { z } from 'zod'
import type { ChatEventReference } from '~/lib/sessions/model'
import { loadSessionSnapshot } from '~/server/lib/chatbotData.server'
import {
  findTimelineEventByDisplayIndex,
  formatTimelineEventSummary,
} from '~/server/lib/sessionEventResolver'
import { insertChatToolEvent, updateChatToolEventStatus } from '~/server/persistence/chatToolEvents.server'

const SINGLE_EVENT_INPUT = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  eventNumber: z.number().int().positive().describe('One-based event number (e.g., 15 for #15).'),
})

const RANGE_INPUT = z
  .object({
    sessionId: z.string().min(1),
    startNumber: z.number().int().positive(),
    endNumber: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(25).default(10),
  })
  .refine((value) => !value.endNumber || value.endNumber >= value.startNumber, {
    message: 'endNumber must be greater than or equal to startNumber',
    path: ['endNumber'],
  })

const ERROR_SUMMARY_INPUT = z.object({
  sessionId: z.string().min(1),
  limit: z.number().int().positive().max(20).default(5),
})

export interface TimelineToolContext {
  sessionId: string
  threadId: string | null
}

export function createTimelineTools(context: TimelineToolContext) {
  return {
    get_timeline_event: tool({
      description: 'Retrieve the full details for a single timeline event number (e.g., #15).',
      inputSchema: SINGLE_EVENT_INPUT,
      execute: async (input, meta) => {
        assertSameSession(context.sessionId, input.sessionId)
        const audit = await insertChatToolEvent({
          sessionId: context.sessionId,
          threadId: context.threadId,
          toolCallId: meta?.toolCallId ?? null,
          toolName: 'get_timeline_event',
          arguments: input,
        })
        try {
          const snapshot = await loadSessionSnapshot(context.sessionId)
          const resolved = findTimelineEventByDisplayIndex(snapshot, input.eventNumber)
          if (!resolved) {
            throw new Error(`Event #${input.eventNumber} does not exist in the loaded session.`)
          }
          const payload = buildToolEventPayload([resolved])
          await updateChatToolEventStatus(audit.id, 'succeeded', {
            result: payload,
            contextEvents: payload.events.map((entry) => entry.context),
          })
          return payload
        } catch (error) {
          await updateChatToolEventStatus(audit.id, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' })
          throw error
        }
      },
    }),
    list_timeline_events: tool({
      description:
        'Retrieve a contiguous range of timeline events (e.g., events #10-#15) so you can reference multiple steps at once.',
      inputSchema: RANGE_INPUT,
      execute: async (input, meta) => {
        assertSameSession(context.sessionId, input.sessionId)
        const audit = await insertChatToolEvent({
          sessionId: context.sessionId,
          threadId: context.threadId,
          toolCallId: meta?.toolCallId ?? null,
          toolName: 'list_timeline_events',
          arguments: input,
        })
        try {
          const snapshot = await loadSessionSnapshot(context.sessionId)
          const items = collectRange(snapshot.events.length, input.startNumber, input.endNumber ?? input.startNumber + input.limit - 1, input.limit)
            .map((number) => findTimelineEventByDisplayIndex(snapshot, number))
            .filter((resolved): resolved is NonNullable<typeof resolved> => Boolean(resolved))
          if (!items.length) {
            throw new Error('No timeline events found for the requested range.')
          }
          const payload = buildToolEventPayload(items)
          await updateChatToolEventStatus(audit.id, 'succeeded', {
            result: payload,
            contextEvents: payload.events.map((entry) => entry.context),
          })
          return payload
        } catch (error) {
          await updateChatToolEventStatus(audit.id, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' })
          throw error
        }
      },
    }),
    summarize_error_events: tool({
      description: 'Summarize recent error-like timeline events (non-zero exits, error outputs).',
      inputSchema: ERROR_SUMMARY_INPUT,
      execute: async (input, meta) => {
        assertSameSession(context.sessionId, input.sessionId)
        const audit = await insertChatToolEvent({
          sessionId: context.sessionId,
          threadId: context.threadId,
          toolCallId: meta?.toolCallId ?? null,
          toolName: 'summarize_error_events',
          arguments: input,
        })
        try {
          const snapshot = await loadSessionSnapshot(context.sessionId)
          const payload = buildErrorSummaryPayload(snapshot, input.limit)
          await updateChatToolEventStatus(audit.id, 'succeeded', {
            result: payload,
            contextEvents: payload.errors.map((entry) => entry.context),
          })
          return payload
        } catch (error) {
          await updateChatToolEventStatus(audit.id, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' })
          throw error
        }
      },
    }),
    find_root_cause_candidates: tool({
      description: 'Highlight likely root-cause events by pairing failures with their immediate predecessors.',
      inputSchema: ERROR_SUMMARY_INPUT,
      execute: async (input, meta) => {
        assertSameSession(context.sessionId, input.sessionId)
        const audit = await insertChatToolEvent({
          sessionId: context.sessionId,
          threadId: context.threadId,
          toolCallId: meta?.toolCallId ?? null,
          toolName: 'find_root_cause_candidates',
          arguments: input,
        })
        try {
          const snapshot = await loadSessionSnapshot(context.sessionId)
          const payload = buildRootCausePayload(snapshot, input.limit)
          await updateChatToolEventStatus(audit.id, 'succeeded', {
            result: payload,
            contextEvents: payload.candidates.map((entry) => entry.context),
          })
          return payload
        } catch (error) {
          await updateChatToolEventStatus(audit.id, 'failed', { error: error instanceof Error ? error.message : 'Unknown error' })
          throw error
        }
      },
    }),
  }
}

function buildToolEventPayload(resolved: ReturnType<typeof findTimelineEventByDisplayIndex>[]) {
  const events = resolved.map((entry) => ({
    eventNumber: entry.displayIndex,
    heading: formatTimelineEventSummary(entry.event, entry.eventIndex, entry.displayIndex).split('\n')[0],
    summary: entry.summary,
    context: buildContextReference(entry),
    eventType: entry.event.type,
  }))
  return { events }
}

function buildContextReference(entry: NonNullable<ReturnType<typeof findTimelineEventByDisplayIndex>>): ChatEventReference {
  return {
    eventIndex: entry.eventIndex,
    displayIndex: entry.displayIndex,
    eventId: typeof entry.event.id === 'string' ? entry.event.id : undefined,
    eventType: entry.event.type,
    summary: formatTimelineEventSummary(entry.event, entry.eventIndex, entry.displayIndex).split('\n')[0],
  }
}

function buildErrorSummaryPayload(snapshot: Awaited<ReturnType<typeof loadSessionSnapshot>>, limit: number) {
  const errors = collectErrorEvents(snapshot.events, limit)
  return {
    errors: errors.map((entry) => ({
      eventNumber: entry.displayIndex,
      heading: formatTimelineEventSummary(entry.event, entry.eventIndex, entry.displayIndex).split('\n')[0],
      summary: entry.summary,
      context: buildContextFromEvent(entry.event, entry.eventIndex, entry.displayIndex),
      eventType: entry.event.type,
    })),
  }
}

function buildRootCausePayload(snapshot: Awaited<ReturnType<typeof loadSessionSnapshot>>, limit: number) {
  const errors = collectErrorEvents(snapshot.events, limit)
  const candidates = errors.map((entry) => ({
    eventNumber: entry.displayIndex,
    heading: formatTimelineEventSummary(entry.event, entry.eventIndex, entry.displayIndex).split('\n')[0],
    summary: entry.summary,
    context: buildContextFromEvent(entry.event, entry.eventIndex, entry.displayIndex),
    eventType: entry.event.type,
  }))
  return { candidates }
}

function collectErrorEvents(events: Awaited<ReturnType<typeof loadSessionSnapshot>>['events'], limit: number) {
  const matches: Array<{
    event: Awaited<ReturnType<typeof loadSessionSnapshot>>['events'][number]
    eventIndex: number
    displayIndex: number
    summary: string
  }> = []
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    const failure = describeFailureEvent(event)
    if (!failure) continue
    const eventIndex = typeof event.index === 'number' ? event.index : index
    const displayIndex = eventIndex + 1
    matches.push({ event, eventIndex, displayIndex, summary: failure })
    if (matches.length >= limit) break
  }
  return matches.reverse()
}

function describeFailureEvent(event: Awaited<ReturnType<typeof loadSessionSnapshot>>['events'][number]) {
  if (event.type === 'LocalShellCall') {
    if (typeof event.exitCode === 'number' && event.exitCode !== 0) {
      return `Shell exited with code ${event.exitCode}${event.stderr ? ` (${trimPreview(event.stderr)})` : ''}`
    }
    if (event.stderr) {
      return `Shell stderr: ${trimPreview(event.stderr)}`
    }
  }
  if (event.type === 'FunctionCall' || event.type === 'CustomToolCall') {
    const output = (event as { result?: unknown; output?: unknown }).result ?? (event as { output?: unknown }).output
    if (output && typeof output === 'object' && 'error' in (output as Record<string, unknown>)) {
      return `Tool error: ${stringifyPreview((output as { error?: unknown }).error)}`
    }
  }
  return null
}

function buildContextFromEvent(
  event: Awaited<ReturnType<typeof loadSessionSnapshot>>['events'][number],
  eventIndex: number,
  displayIndex: number,
): ChatEventReference {
  return {
    eventIndex,
    displayIndex,
    eventId: typeof event.id === 'string' ? event.id : undefined,
    eventType: event.type,
    summary: formatTimelineEventSummary(event, eventIndex, displayIndex).split('\n')[0],
  }
}

function stringifyPreview(value: unknown) {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function trimPreview(value: string, max = 120) {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

function collectRange(total: number, start: number, end: number, limit: number) {
  const results: number[] = []
  const boundedStart = Math.max(1, Math.min(start, total))
  const boundedEnd = Math.max(boundedStart, Math.min(end, total))
  for (let current = boundedStart; current <= boundedEnd && results.length < limit; current += 1) {
    results.push(current)
  }
  return results
}

function assertSameSession(expected: string, actual: string) {
  if (expected !== actual) {
    throw new Error('Tool invocation sessionId does not match the active session.')
  }
}
