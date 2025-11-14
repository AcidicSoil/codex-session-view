import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { streamParseSession, type ParserError } from '~/lib/session-parser';
import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser';

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

const STORAGE_KEY = 'codex-viewer:session';
const STORAGE_PREF_KEY = 'codex-viewer:persist';

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
  const [persist, setPersist] = useState<boolean>(true);

  const start = useCallback(
    async (file: File) => {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      dispatch({ type: 'start' });
      try {
        for await (const item of streamParseSession(file)) {
          if (item.kind === 'meta') {
            dispatch({ type: 'meta', meta: item.meta });
          } else if (item.kind === 'event') {
            dispatch({ type: 'event', event: item.event });
          } else if (item.kind === 'error') {
            dispatch({ type: 'fail', error: item.error });
          }
        }
        dispatch({ type: 'done' });
      } catch (error) {
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
    [dispatch]
  );

  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const progress = useMemo(() => {
    const total = state.ok + state.fail;
    return { ok: state.ok, fail: state.fail, total };
  }, [state.ok, state.fail]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const pref = window.localStorage.getItem(STORAGE_PREF_KEY);
    if (pref === 'false') {
      setPersist(false);
    }
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const snapshot = JSON.parse(raw) as Snapshot;
      if (snapshot.events?.length) {
        dispatch({ type: 'hydrate', snapshot });
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      if (!event.newValue) {
        dispatch({ type: 'reset' });
        return;
      }
      try {
        const snapshot = JSON.parse(event.newValue) as Snapshot;
        dispatch({ type: 'hydrate', snapshot });
      } catch {}
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_PREF_KEY, persist ? 'true' : 'false');
  }, [persist]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!persist) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (state.phase === 'parsing') return;
    if (state.events.length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const snapshot: Snapshot = { meta: state.meta, events: state.events };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {}
  }, [state.meta, state.events, state.phase, persist]);

  return { state, progress, start, reset, persist, setPersist };
}

export type FileLoaderHook = ReturnType<typeof useFileLoader>;
