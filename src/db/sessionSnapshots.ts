import { createCollection, localStorageCollectionOptions } from '@tanstack/db';
import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser';

export const ACTIVE_SNAPSHOT_ID = 'active-session';

export interface SessionSnapshotRecord {
  id: string;
  meta?: SessionMetaParsed;
  events: ResponseItemParsed[];
  persistedAt: number;
}

export const sessionSnapshotCollection = createCollection(
  localStorageCollectionOptions<SessionSnapshotRecord>({
    id: 'session-snapshots',
    storageKey: 'codex-viewer:session',
    getKey: (snapshot) => snapshot.id,
  })
);

export async function upsertSessionSnapshot(record: SessionSnapshotRecord) {
  const existing = sessionSnapshotCollection.get(record.id);
  if (existing) {
    await sessionSnapshotCollection.update(record.id, (draft) => {
      draft.meta = record.meta;
      draft.events = record.events;
      draft.persistedAt = record.persistedAt;
    });
    return;
  }
  await sessionSnapshotCollection.insert(record);
}

export async function clearSessionSnapshot(id: string = ACTIVE_SNAPSHOT_ID) {
  try {
    await sessionSnapshotCollection.delete(id);
  } catch (error) {
    if ((error as Error)?.name === 'CollectionOperationError') {
      return;
    }
    throw error;
  }
}
