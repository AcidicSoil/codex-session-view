import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { streamParseSession, type ParserError } from '~/lib/session-parser';
import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser';
import {
  ACTIVE_SNAPSHOT_ID,
  clearSessionSnapshot,
  sessionSnapshotCollection,
  upsertSessionSnapshot,
  type SessionSnapshotRecord,
} from '~/db/sessionSnapshots';
import { useSessionStorage } from './useSessionStorage';
import { logDebug, logError, logInfo } from '~/lib/logger';

export type LoadPhase = 'idle' | 'parsing' | 'error' | 'success';

interface State {
  phase: LoadPhase;
  meta?: SessionMetaParsed;
  events: ResponseItemParsed[];
  ok: number;
  fail: number;
  lastError?: ParserError;
}

type Action =
  | { type: 'reset' }
  | { type: 'start' }
  | { type: 'meta'; meta: SessionMetaParsed }
  | { type: 'event'; event: ResponseItemParsed }
  | { type: 'fail'; error: ParserError }
  | { type: 'done' }
  | { type: 'hydrate'; snapshot: Snapshot };

interface Snapshot {
  meta?: SessionMetaParsed;
  events: ResponseItemParsed[];
}

const initialState: State = {
  phase: 'idle',
  events: [],
  ok: 0,
  fail: 0,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'reset':
      return { ...initialState };
    case 'start':
      return { ...initialState, phase: 'parsing' };
    case 'meta':
      return { ...state, meta: action.meta };
    case 'event':
      return {
        ...state,
        ok: state.ok + 1,
        events: [...state.events, action.event],
      };
    case 'fail':
      return {
        ...state,
        fail: state.fail + 1,
        lastError: action.error,
      };
    case 'done':
      return {
        ...state,
        phase: state.fail > 0 ? 'error' : 'success',
      };
    case 'hydrate': {
      const nextEvents = action.snapshot.events ?? [];
      return {
        ...state,
        meta: action.snapshot.meta,
        events: nextEvents,
        ok: nextEvents.length,
        fail: 0,
        phase: nextEvents.length > 0 ? 'success' : 'idle',
      };
    }
    default:
      return state;
  }
}

export function useFileLoader() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [persist, setPersist] = useSessionStorage<boolean>('codex-viewer:persist', true);
  const [hydrated, setHydrated] = useState(false);
  const lastSnapshotVersionRef = useRef<number | null>(null);
  const { data: snapshotRows } = useLiveQuery(sessionSnapshotCollection);
  const persistedSnapshot = snapshotRows?.find((row) => row.id === ACTIVE_SNAPSHOT_ID);

  const start = useCallback(
    async (file: File) => {
      if (persist) {
        try {
          await clearSessionSnapshot();
        } catch (error) {
          logError('file-loader', 'Failed to clear snapshot before parse', error as Error);
        }
      }
      logInfo('file-loader', 'Starting parse', { name: file.name, size: file.size });
      dispatch({ type: 'start' });
      try {
        let parsedEvents = 0;
        let encounteredErrors = 0;
        for await (const item of streamParseSession(file)) {
          if (item.kind === 'meta') {
            const { instructions, ...cleanMetadata } = item.meta ?? {};
            logDebug('file-loader', 'Parsed session metadata', cleanMetadata);
            dispatch({ type: 'meta', meta: item.meta });
          } else if (item.kind === 'event') {
            parsedEvents += 1;
            dispatch({ type: 'event', event: item.event });
          } else if (item.kind === 'error') {
            encounteredErrors += 1;
            logError('file-loader', 'Parser emitted error', item.error);
            dispatch({ type: 'fail', error: item.error });
          }
        }
        dispatch({ type: 'done' });
        logInfo('file-loader', 'Parse completed', { events: parsedEvents, errors: encounteredErrors });
      } catch (error) {
        logError('file-loader', 'Parser crashed', error as Error);
        dispatch({
          type: 'fail',
          error: {
            line: -1,
            reason: 'invalid_schema',
            message: error instanceof Error ? error.message : 'Unknown error',
            raw: '',
          },
        });
        dispatch({ type: 'done' });
      }
    },
    [dispatch, persist]
  );

  const reset = useCallback(() => {
    logInfo('file-loader', 'Resetting loader state');
    dispatch({ type: 'reset' });
    if (persist) {
      void clearSessionSnapshot().catch((error) => {
        logError('file-loader', 'Failed to clear snapshot during reset', error as Error);
      });
    }
  }, [persist]);

  const progress = useMemo(() => {
    const total = state.ok + state.fail;
    return { ok: state.ok, fail: state.fail, total };
  }, [state.ok, state.fail]);

  useEffect(() => {
    if (!persist) {
      lastSnapshotVersionRef.current = null;
      void clearSessionSnapshot().catch((error) => {
        logError('file-loader', 'Failed to clear persisted snapshot', error as Error);
      });
      return;
    }
    if (state.phase === 'parsing') return;
    if (state.events.length === 0) {
      lastSnapshotVersionRef.current = null;
      void clearSessionSnapshot().catch((error) => {
        logError('file-loader', 'Failed to clear empty snapshot', error as Error);
      });
      return;
    }
    const snapshot: SessionSnapshotRecord = {
      id: ACTIVE_SNAPSHOT_ID,
      meta: state.meta,
      events: state.events,
      persistedAt: Date.now(),
    };
    lastSnapshotVersionRef.current = snapshot.persistedAt;
    void upsertSessionSnapshot(snapshot).catch((error) => {
      logError('file-loader', 'Failed to persist snapshot', error as Error);
    });
  }, [persist, state.meta, state.events, state.phase]);

  useEffect(() => {
    if (!persist) {
      setHydrated(true);
      return;
    }
    if (!persistedSnapshot) {
      setHydrated(true);
      return;
    }
    if (state.phase === 'parsing') return;
    if (lastSnapshotVersionRef.current === persistedSnapshot.persistedAt) {
      setHydrated(true);
      return;
    }
    const snapshot: Snapshot = { meta: persistedSnapshot.meta, events: persistedSnapshot.events };
    dispatch({ type: 'hydrate', snapshot });
    logInfo('file-loader', 'Hydrated snapshot from storage', {
      events: snapshot.events?.length ?? 0,
    });
    lastSnapshotVersionRef.current = persistedSnapshot.persistedAt;
    setHydrated(true);
  }, [persistedSnapshot, persist, state.phase]);

  return { state, progress, start, reset, persist, setPersist, hydrated };
}

export type FileLoaderHook = ReturnType<typeof useFileLoader>;
