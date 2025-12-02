import type { MisalignmentSeverity } from '~/lib/sessions/model';

export interface ChatRemediationMetadata {
  misalignmentId?: string;
  ruleId?: string;
  severity?: MisalignmentSeverity;
  eventRange?: { startIndex: number; endIndex: number };
}

export interface CoachPrefillPayload {
  prompt: string;
  metadata?: ChatRemediationMetadata;
}
