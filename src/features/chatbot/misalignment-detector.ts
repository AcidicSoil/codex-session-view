// path: src/features/chatbot/misalignment-detector.ts
import { type ChatMessage } from '@/lib/chatbot/types';

export type MisalignmentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface MisalignmentRule {
  id: string;
  patterns: string[];
  severity: MisalignmentSeverity;
  description: string;
}

export interface MisalignmentResult {
  ruleId: string;
  text: string;
  severity: MisalignmentSeverity;
}

export interface AnalysisContext {
  sessionId: string;
  rules: MisalignmentRule[];
}

export class MisalignmentDetector {
  /**
   * Analyzes a message against a set of dynamic rules to detect misalignments.
   * Uses case-insensitive regex matching for patterns.
   */
  async analyze(
    text: string,
    context: AnalysisContext
  ): Promise<{ misalignments: MisalignmentResult[] }> {
    const misalignments: MisalignmentResult[] = [];
    const { rules } = context;

    if (!rules || rules.length === 0) {
      return { misalignments };
    }

    for (const rule of rules) {
      // Check each pattern in the rule
      const isViolation = rule.patterns.some((pattern) => {
        try {
          // Create a case-insensitive regex from the pattern
          // 'i' flag ensures "Delete" matches "delete"
          const regex = new RegExp(pattern, 'i');
          return regex.test(text);
        } catch (error) {
          console.warn(
            `[MisalignmentDetector] Invalid regex pattern provided: "${pattern}"`,
            error
          );
          // Fallback to simple inclusion check if regex fails
          return text.toLowerCase().includes(pattern.toLowerCase());
        }
      });

      if (isViolation) {
        misalignments.push({
          ruleId: rule.id,
          text, // In a real scenario, you might want to return just the matching snippet
          severity: rule.severity,
        });
      }
    }

    return { misalignments };
  }
}

/**
 * Helper function used by tests to run detection on a snapshot object.
 * Restores compatibility with existing tests expecting a functional export.
 */
export async function detectMisalignments(params: { snapshot: any }) {
  const { snapshot } = params;
  const detector = new MisalignmentDetector();

  // Robustly extract rules from likely locations in the snapshot/fixture
  const rules: MisalignmentRule[] = snapshot.rules || snapshot.misalignmentRules || [];

  // Robustly extract text from likely locations
  let text = '';

  if (typeof snapshot.text === 'string') {
    text = snapshot.text;
  } else if (typeof snapshot.content === 'string') {
    text = snapshot.content;
  } else if (Array.isArray(snapshot.messages)) {
    // Combine content from messages if provided as an array
    text = snapshot.messages.map((m: any) => m.content || '').join('\n');
  }

  // Default context
  const context: AnalysisContext = {
    sessionId: snapshot.id || 'test-session',
    rules,
  };

  return detector.analyze(text, context);
}
