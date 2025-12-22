import { useCallback, useMemo, useReducer } from 'react';
import type { ParserError } from '~/lib/session-parser';
import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser';
import { useSessionStorage } from './useSessionStorage';
import { logError, logInfo } from '~/lib/logger';
import { fetchSessionSnapshot } from '~/server/function/sessionSnapshots';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';

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

  const loadSession = useCallback(
    async (asset: Pick<DiscoveredSessionAsset, 'sessionId' | 'path'>) => {
      if (!asset.sessionId) return
      logInfo('file-loader', 'Loading session snapshot', { sessionId: asset.sessionId, path: asset.path })
      dispatch({ type: 'start' })
      try {
        const snapshot = await fetchSessionSnapshot({
          data: { sessionId: asset.sessionId, assetPath: asset.path },
        })
        dispatch({
          type: 'hydrate',
          snapshot: { meta: snapshot.meta, events: snapshot.events ?? [] },
        })
        dispatch({ type: 'done' })
      } catch (error) {
        logError('file-loader', 'Failed to load session snapshot', error as Error)
        dispatch({
          type: 'fail',
          error: {
            line: -1,
            reason: 'invalid_schema',
            message: error instanceof Error ? error.message : 'Unknown error',
            raw: '',
          },
        })
        dispatch({ type: 'done' })
      }
    },
    [dispatch],
  )

  const reset = useCallback(() => {
    logInfo('file-loader', 'Resetting loader state');
    dispatch({ type: 'reset' });
  }, []);

  const progress = useMemo(() => {
    const total = state.ok + state.fail;
    return { ok: state.ok, fail: state.fail, total };
  }, [state.ok, state.fail]);

  return { state, progress, loadSession, reset, persist, setPersist };
}

export type FileLoaderHook = ReturnType<typeof useFileLoader>;
