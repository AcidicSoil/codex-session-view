import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearSessionSnapshots,
  getSessionSnapshot,
  upsertSessionSnapshot,
} from '~/server/persistence/sessionSnapshots.server';
import type { SessionSnapshotRecord } from '~/server/persistence/sessionSnapshots.server';

describe('sessionSnapshots persistence', () => {
beforeEach(async () => {
  await clearSessionSnapshots();
});

  it('clearSessionSnapshot can be called multiple times without throwing', async () => {
    await clearSessionSnapshots();
    await expect(clearSessionSnapshots()).resolves.toBeUndefined();
  });

  it('persists and removes the active snapshot', async () => {
    const record: SessionSnapshotRecord = {
      sessionId: 'session-123',
      assetPath: 'uploads/example.json',
      source: 'upload',
      persisted: true,
      meta: undefined,
      events: [{ type: 'message', role: 'user', content: 'hello world' } as any],
      eventCount: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await upsertSessionSnapshot(record);
    expect(getSessionSnapshot('session-123')).toBeDefined();
    await clearSessionSnapshots();
    expect(getSessionSnapshot('session-123')).toBeNull();
  });
});
