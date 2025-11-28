import type { AgentRule } from '~/lib/agents-rules/parser';
import {
  createMisalignmentRecord,
  type MisalignmentRecord,
  type SessionSnapshot,
  type SessionEventRange,
} from '~/lib/sessions/model';
import type { ResponseItemParsed } from '~/lib/session-parser';

interface MisalignmentDetectorOptions {
  snapshot: SessionSnapshot;
  agentRules: AgentRule[];
  existing?: MisalignmentRecord[];
}

export interface MisalignmentDetectorResult {
  misalignments: MisalignmentRecord[];
  warnings: string[];
}

// Common instruction words that won't appear in code/logs and should be ignored for detection.
const IGNORED_TERMS = new Set([
  'avoid',
  'never',
  "don't",
  'do',
  'not',
  'should',
  'must',
  'ensure',
  'prefer',
  'use',
  'always',
  'consider',
  'check',
  'verify',
  'update',
  'file',
  'changes',
  'missing',
  'detected',
  'potential',
  'issue',
]);

export function detectMisalignments(
  options: MisalignmentDetectorOptions
): MisalignmentDetectorResult {
  const warnings: string[] = [];
  const newRecords: MisalignmentRecord[] = [];
  const searchableEvents = normalizeEvents(options.snapshot.events);

  for (const rule of options.agentRules) {
    // 1. Get keywords from the rule
    let keywords = rule.keywords ?? [];

    // If keywords are empty (fallback), try deriving from heading
    if (keywords.length === 0) {
      keywords = deriveTriggerKeywords(rule.heading);
    }

    // 2. Filter out policy words (detection-time filtering)
    // The parser might include "avoid" in keywords, but we want to detect the *thing* being avoided, not the word "avoid".
    const activeKeywords = keywords.filter((k) => !IGNORED_TERMS.has(k) && k.length > 2);

    // Skip rules that became empty after filtering
    if (activeKeywords.length < 1) {
      continue;
    }

    // 3. Skip if this rule is already flagged
    if (hasExisting(options.existing, rule.id)) {
      continue;
    }

    // 4. Scan events for these keywords
    const matchIndex = findFirstMatch(searchableEvents, activeKeywords);

    if (matchIndex !== null) {
      const eventRange = deriveEventRange(searchableEvents, matchIndex);

      newRecords.push(
        createMisalignmentRecord({
          sessionId: options.snapshot.sessionId,
          ruleId: rule.id,
          title: rule.heading,
          summary: `Detected potential violation: "${activeKeywords.join(' ')}"`,
          severity: rule.severity,
          evidence: [
            {
              message: `Found keywords: ${activeKeywords.join(', ')}`,
              eventIndex: eventRange?.startIndex,
              eventId: searchableEvents.find((item) => item.index === eventRange?.startIndex)?.id,
              highlight: searchableEvents[matchIndex].text.slice(0, 200),
            },
          ],
          eventRange: eventRange ?? undefined,
          status: 'open',
        })
      );
    }
  }

  return { misalignments: newRecords, warnings };
}

function deriveTriggerKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 2)
    .filter((t) => !IGNORED_TERMS.has(t));
}

function normalizeEvents(
  events: ResponseItemParsed[]
): Array<{ index: number; id?: string; at?: string; text: string }> {
  return events.map((event, index) => ({
    index,
    id: event.id,
    at: (event as { at?: string }).at,
    text: stringifyEvent(event).toLowerCase(),
  }));
}

function stringifyEvent(event: ResponseItemParsed) {
  switch (event.type) {
    case 'Message':
      return typeof event.content === 'string' ? event.content : JSON.stringify(event.content);
    case 'Reasoning':
      return event.content;
    case 'LocalShellCall':
      return `${event.command} ${event.stdout ?? ''} ${event.stderr ?? ''}`;
    case 'FunctionCall':
      return `${event.name} ${JSON.stringify(event.args ?? {})}`;
    default:
      return JSON.stringify(event);
  }
}

function findFirstMatch(events: Array<{ index: number; text: string }>, keywords: string[]) {
  for (const event of events) {
    // Strict Mode: All keywords must exist in the event text
    const matches = keywords.every((keyword) => event.text.includes(keyword));
    if (matches) {
      return event.index;
    }
  }
  return null;
}

function deriveEventRange(
  events: Array<{ index: number; id?: string; at?: string }>,
  index: number
): SessionEventRange | null {
  const hit = events.find((event) => event.index === index);
  if (!hit) {
    return null;
  }
  const startIndex = Math.max(0, hit.index - 2);
  const endIndex = Math.min(events.length - 1, hit.index + 1);
  const startEvent = events.find((event) => event.index === startIndex) ?? hit;
  const endEvent = events.find((event) => event.index === endIndex) ?? hit;
  return {
    startIndex,
    endIndex,
    startAt: startEvent.at ?? new Date().toISOString(),
    endAt: endEvent.at ?? startEvent.at ?? new Date().toISOString(),
  };
}

function hasExisting(existing: MisalignmentRecord[] | undefined, ruleId: string) {
  if (!existing) return false;
  return existing.some((record) => record.ruleId === ruleId && record.status !== 'dismissed');
}
