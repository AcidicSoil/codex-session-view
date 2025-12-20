import type { ChatMessageRecord } from '~/lib/sessions/model';

export interface LocalMessage extends ChatMessageRecord {
  pending?: boolean;
}
