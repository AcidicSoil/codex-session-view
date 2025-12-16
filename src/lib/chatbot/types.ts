import type { MisalignmentSeverity } from '~/lib/sessions/model';
import type { ChatMode } from '~/lib/sessions/model';

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

export interface ChatThreadSummary {
  id: string;
  title: string;
  status: 'active' | 'archived';
  messageCount: number;
  lastMessagePreview?: string;
  lastMessageAt?: string;
  mode: ChatMode;
}
