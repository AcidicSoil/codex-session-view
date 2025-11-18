import { describe, expect, it, beforeEach } from 'vitest';
import {
  ACTIVE_SNAPSHOT_ID,
  clearSessionSnapshot,
  sessionSnapshotCollection,
  upsertSessionSnapshot,
} from '~/db/sessionSnapshots';

describe('sessionSnapshots persistence', () => {
beforeEach(async () => {
  sessionSnapshotCollection.startSyncImmediate?.();
  await clearSessionSnapshot();
});

  it('clearSessionSnapshot can be called multiple times without throwing', async () => {
    await clearSessionSnapshot();
    await expect(clearSessionSnapshot()).resolves.toBeUndefined();
  });

  it('persists and removes the active snapshot', async () => {
    const record = {
      id: ACTIVE_SNAPSHOT_ID,
      meta: undefined,
      events: [{ type: 'message', role: 'user', content: 'hello world' } as any],
      persistedAt: Date.now(),
    };
    await upsertSessionSnapshot(record);
    expect(sessionSnapshotCollection.get(ACTIVE_SNAPSHOT_ID)).toBeDefined();
    await clearSessionSnapshot();
    expect(sessionSnapshotCollection.get(ACTIVE_SNAPSHOT_ID)).toBeUndefined();
  });
});
