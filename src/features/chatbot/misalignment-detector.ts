// path: src/features/chatbot/misalignment-detector.ts
import type {
  MisalignmentRecord,
  MisalignmentSeverity,
  MisalignmentStatus,
  MisalignmentEvidence,
} from '~/lib/sessions/model';

export interface MisalignmentRule {
  id: string;
  severity: MisalignmentSeverity;
  patterns?: string[];
  keywords?: string[]; // Support AgentRule keywords
  description?: string;
  heading?: string; // Support AgentRule heading
  summary?: string; // Support AgentRule summary
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
    // Cast the incoming AgentRules to our internal compatible interface
    rules = agentRules as unknown as MisalignmentRule[];
  } else if (snapshot.rules || snapshot.misalignmentRules) {
    rules = (snapshot.rules || snapshot.misalignmentRules) as MisalignmentRule[];
  }

  // 2. Extract text content from various snapshot formats
  let text = '';

  if (typeof snapshot.text === 'string') {
    text = snapshot.text;
  } else if (typeof snapshot.content === 'string') {
    text = snapshot.content;
  } else if (Array.isArray(snapshot.events)) {
    // Handle 'events' array common in SessionSnapshot
    text = snapshot.events
      .filter((e: any) => e.type === 'Message' && e.content)
      .map((e: any) => e.content)
      .join('\n');
  } else if (Array.isArray(snapshot.messages)) {
    text = snapshot.messages.map((m: any) => m.content || '').join('\n');
  }

  const sessionId = snapshot.id || snapshot.sessionId || 'test-session';

  // 3. Prepare Context
  const context: AnalysisContext = {
    sessionId,
    rules,
  };

  // 4. Analyze (Synchronously)
  const result = detector.analyze(text, context);

  // 5. Map to full MisalignmentRecord structure expected by tests
  const records: MisalignmentRecord[] = result.misalignments.map((m, idx) => {
    const evidenceItem: MisalignmentEvidence = {
      message: m.text,
    };

    return {
      id: `temp-misalignment-${idx}`,
      sessionId,
      ruleId: m.ruleId,
      title: m.ruleTitle || m.ruleId,
      summary: m.ruleSummary || '',
      severity: m.severity,
      status: 'open' as MisalignmentStatus,
      evidence: [evidenceItem],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  return {
    misalignments: records,
    warnings: result.warnings,
  };
}
