// path: src/features/chatbot/misalignment-detector.ts
import type {
  MisalignmentRecord,
  MisalignmentSeverity,
  MisalignmentStatus,
  MisalignmentEvidence,
  SessionEventRange,
} from '~/lib/sessions/model';

export interface MisalignmentRule {
  id: string;
  severity: MisalignmentSeverity;
  patterns?: string[];
  keywords?: string[]; // Support AgentRule keywords
  description?: string;
  heading?: string; // Support AgentRule heading
  summary?: string; // Support AgentRule summary
  source?: 'bullet' | 'heading';
}

export interface MisalignmentResult {
  ruleId: string;
  text: string;
  severity: MisalignmentSeverity;
  ruleTitle?: string;
  ruleSummary?: string;
}

export interface AnalysisContext {
  sessionId: string;
  rules: MisalignmentRule[];
}

interface MisalignmentDetectionResult {
  misalignments: MisalignmentResult[];
  warnings: string[];
}

export class MisalignmentDetector {
  /**
   * Analyzes a message against a set of dynamic rules to detect misalignments.
   * Checks both regex 'patterns' and simple string 'keywords'.
   * Synchronous implementation.
   */
  analyze(text: string, context: AnalysisContext): MisalignmentDetectionResult {
    const misalignments: MisalignmentResult[] = [];
    const warnings: string[] = [];
    const { rules } = context;

    if (!rules || rules.length === 0) {
      return { misalignments, warnings };
    }

    for (const rule of rules) {
      // 1. Gather all triggers (regex patterns or simple keywords)
      const triggers: string[] = [...(rule.patterns || []), ...(rule.keywords || [])];

      if (triggers.length === 0) continue;

      // 2. Check for violations
      const isViolation = triggers.some((trigger) => {
        try {
          // Attempt regex match first
          // We use 'i' for case-insensitive matching
          const regex = new RegExp(trigger, 'i');
          return regex.test(text);
        } catch (error) {
          warnings.push(
            `Invalid regex trigger "${trigger}" for rule "${rule.id}": ${
              error instanceof Error ? error.message : 'unknown error'
            }`
          );
          // Fallback to simple inclusion if regex fails
          return text.toLowerCase().includes(trigger.toLowerCase());
        }
      });

      if (isViolation) {
        misalignments.push({
          ruleId: rule.id,
          text,
          severity: rule.severity,
          ruleTitle: rule.heading || rule.id,
          ruleSummary: rule.summary || rule.description || 'Misalignment detected',
        });
      }
    }

    return { misalignments, warnings };
  }
}

/**
 * Helper function used by tests to run detection on a snapshot object.
 * Returns fully shaped MisalignmentRecord objects to satisfy test helpers.
 * This function is SYNCHRONOUS.
 */
type TextSource = {
  text: string;
  eventIndex?: number;
  eventId?: string;
  eventAt?: string;
};

export function detectMisalignments(params: {
  snapshot: any;
  agentRules?: any[];
  existing?: MisalignmentRecord[];
}): {
  misalignments: MisalignmentRecord[];
  warnings: string[];
} {
  const { snapshot, agentRules } = params;
  const detector = new MisalignmentDetector();

  // 1. Extract rules from snapshot OR the provided agentRules argument
  let rules: MisalignmentRule[] = [];

  if (agentRules && Array.isArray(agentRules)) {
    const rawRules = agentRules as unknown as MisalignmentRule[];
    rules = rawRules.filter((rule) => {
      const hasTriggers = (rule.patterns?.length ?? 0) + (rule.keywords?.length ?? 0) > 0;
      const isBullet = (rule.source ?? 'bullet') === 'bullet';
      const isInformational = rule.severity === 'info';
      return hasTriggers && isBullet && !isInformational;
    });
  } else if (snapshot.rules || snapshot.misalignmentRules) {
    rules = (snapshot.rules || snapshot.misalignmentRules) as MisalignmentRule[];
  }

  // 2. Extract text content from various snapshot formats
  const textSources: TextSource[] = [];

  if (Array.isArray(snapshot.events) && snapshot.events.length > 0) {
    snapshot.events.forEach((event: any, index: number) => {
      const content = extractEventContent(event);
      if (!content) return;
      textSources.push({
        text: content,
        eventIndex: typeof event.index === 'number' ? event.index : index,
        eventId: typeof event.id === 'string' ? event.id : undefined,
        eventAt: typeof event.at === 'string' ? event.at : undefined,
      });
    });
  }

  if (textSources.length === 0) {
    const fallbackText = extractSnapshotText(snapshot);
    if (fallbackText) {
      textSources.push({ text: fallbackText });
    }
  }

  const sessionId = snapshot.id || snapshot.sessionId || 'test-session';

  // 3. Prepare Context
  const context: AnalysisContext = {
    sessionId,
    rules,
  };

  // 4. Analyze (Synchronously)
  const grouped = new Map<string, MisalignmentRecord>();
  const warnings: string[] = [];

  textSources.forEach((source) => {
    if (!source.text || source.text.trim().length === 0) {
      return;
    }
    const result = detector.analyze(source.text, context);
    warnings.push(...result.warnings);
    result.misalignments.forEach((m) => {
      const evidenceItem: MisalignmentEvidence = {
        message: source.text,
        eventIndex: typeof source.eventIndex === 'number' ? source.eventIndex : undefined,
        eventId: source.eventId,
        highlight: buildEvidenceHighlight(source),
      };
      const stableId = `mis-${sessionId}-${m.ruleId}`;
      const existingRecord = grouped.get(m.ruleId);
      if (existingRecord) {
        existingRecord.evidence = [...existingRecord.evidence, evidenceItem];
        existingRecord.updatedAt = new Date().toISOString();
        if (typeof evidenceItem.eventIndex === 'number') {
          existingRecord.eventRange = updateEventRange(existingRecord.eventRange, evidenceItem, source);
        }
        return;
      }

      const nextRecord: MisalignmentRecord = {
        id: stableId,
        sessionId,
        ruleId: m.ruleId,
        title: m.ruleTitle || m.ruleId,
        summary: m.ruleSummary || '',
        severity: m.severity,
        status: 'open' as MisalignmentStatus,
        evidence: [evidenceItem],
        eventRange:
          typeof evidenceItem.eventIndex === 'number'
            ? buildInitialRange(evidenceItem, source)
            : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      grouped.set(m.ruleId, nextRecord);
    });
  });

  return {
    misalignments: Array.from(grouped.values()),
    warnings,
  };
}

function extractSnapshotText(snapshot: any) {
  if (typeof snapshot.text === 'string') {
    return snapshot.text
  }
  if (typeof snapshot.content === 'string') {
    return snapshot.content
  }
  if (Array.isArray(snapshot.messages)) {
    return snapshot.messages.map((m: any) => m.content || '').join('\n')
  }
  return ''
}

function extractEventContent(event: any) {
  if (!event) return ''
  if (typeof event.content === 'string') return event.content
  if (Array.isArray(event.content)) {
    return event.content
      .map((part) => {
        if (typeof part === 'string') return part
        if (typeof part?.text === 'string') return part.text
        return ''
      })
      .filter(Boolean)
      .join('\n')
  }
  if (typeof event.command === 'string') return event.command
  if (typeof event.path === 'string') return event.path
  return ''
}

function buildEvidenceHighlight(source: TextSource) {
  if (typeof source.eventIndex === 'number') {
    const base = `event #${source.eventIndex + 1}`
    if (source.eventAt) {
      return `${base} • ${source.eventAt}`
    }
    return base
  }
  return undefined
}

function buildInitialRange(evidence: MisalignmentEvidence, source: TextSource): SessionEventRange {
  const index = evidence.eventIndex ?? 0
  const at = source.eventAt ?? ''
  return {
    startIndex: index,
    endIndex: index,
    startAt: at,
    endAt: at,
  }
}

function updateEventRange(
  range: SessionEventRange | undefined,
  evidence: MisalignmentEvidence,
  source: TextSource,
): SessionEventRange {
  const index = evidence.eventIndex ?? 0
  const at = source.eventAt ?? ''
  if (!range) {
    return buildInitialRange(evidence, source)
  }
  const startIndex = Math.min(range.startIndex, index)
  const endIndex = Math.max(range.endIndex, index)
  const startAt = range.startAt && range.startAt.length ? range.startAt : at
  const endAt = at || range.endAt
  return {
    startIndex,
    endIndex,
    startAt,
    endAt,
  }
}
