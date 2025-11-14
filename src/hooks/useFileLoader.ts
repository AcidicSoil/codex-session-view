import { useCallback, useMemo, useReducer } from 'react';
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
  | { type: 'done' };

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
    default:
      return state;
  }
}

export function useFileLoader() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const start = useCallback(
    async (file: File) => {
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

  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const progress = useMemo(() => {
    const total = state.ok + state.fail;
    return { ok: state.ok, fail: state.fail, total };
  }, [state.ok, state.fail]);

  return { state, progress, start, reset };
}

export type FileLoaderHook = ReturnType<typeof useFileLoader>;
