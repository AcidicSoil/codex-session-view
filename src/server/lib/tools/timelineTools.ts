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
