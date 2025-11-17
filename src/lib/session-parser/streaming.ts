import { streamTextLines } from '~/utils/line-reader';
import {
  parseResponseItemLine,
  parseSessionMetaLine,
  type ParseFailureReason,
  type SafeResult,
} from './validators';
import type { ResponseItemParsed, SessionMetaParsed } from './schemas';

export interface ParserError {
  readonly line: number;
  readonly reason: ParseFailureReason;
  readonly message: string;
  readonly raw: string;
}

export interface ParserStats {
  readonly totalLines: number;
  readonly parsedEvents: number;
  readonly failedLines: number;
  readonly durationMs: number;
}

export interface ParserOptions {
  readonly maxErrors?: number;
}

export type ParserEvent =
  | { kind: 'meta'; line: 1; meta: SessionMetaParsed; version: string | number }
  | { kind: 'event'; line: number; event: ResponseItemParsed }
  | { kind: 'error'; error: ParserError }
  | { kind: 'done'; stats: ParserStats };

function pickVersion(meta: SessionMetaParsed | undefined) {
  const v = meta?.version;
  if (v === undefined || v === null || v === '') return 1;
  return v;
}

export async function* streamParseSession(
  blob: Blob,
  opts: ParserOptions = {}
): AsyncGenerator<ParserEvent> {
  const started = performance.now?.() ?? Date.now();
  let total = 0;
  let parsed = 0;
  let failed = 0;
  const maxErrors = opts.maxErrors ?? Number.POSITIVE_INFINITY;

  let meta: SessionMetaParsed | undefined;
  let version: string | number = 1;

  const pendingCalls = new Map<string, ResponseItemParsed>();

  let lineNo = 0;
  for await (const line of streamTextLines(blob)) {
    lineNo++;
    total++;

    if (!line || line.trim().length === 0) continue;
    const trimmed = line.trim();
    if (trimmed === '[' || trimmed === ']' || trimmed === '],') continue;

    if (!meta) {
      const mres = parseSessionMetaLine(line);
      if (mres.success) {
        meta = mres.data;
        version = pickVersion(meta);
        yield { kind: 'meta', line: 1 as const, meta, version };
        continue;
      }
      const evTry = parseResponseItemLine(line);
      if (evTry.success) {
        meta = { timestamp: new Date().toISOString() } as SessionMetaParsed;
        version = pickVersion(meta);
        yield { kind: 'meta', line: 1 as const, meta, version };
        parsed++;
        yield { kind: 'event', line: lineNo, event: evTry.data };
        continue;
      }
      try {
        const obj = JSON.parse(line) as any;
        if (obj && typeof obj === 'object' && obj.record_type === 'state') continue;
      } catch {}
      failed++;
      yield {
        kind: 'error',
        error: {
          line: lineNo,
          reason: mres.reason,
          message: mres.error.message,
          raw: line,
        },
      };
      if (failed >= maxErrors) break;
      continue;
    }

    try {
      if (line.trim().startsWith('{')) {
        const obj = JSON.parse(line) as any;
        const rt = obj?.record_type ?? obj?.recordType ?? obj?.kind;
        if (
          obj &&
          typeof obj === 'object' &&
          typeof rt === 'string' &&
          String(rt).toLowerCase() === 'state'
        ) {
          continue;
        }
      }
    } catch {}

    const res = parseLineByVersion(version, line);
    if (!res.success) {
      failed++;
      yield {
        kind: 'error',
        error: {
          line: lineNo,
          reason: res.reason,
          message: res.error.message,
          raw: line,
        },
      };
      if (failed >= maxErrors) break;
    } else {
      const ev = res.data;
      if (ev.type === 'FunctionCall') {
        const callId = (ev as any).call_id as string | undefined;
        if (callId) {
          if (ev.result === undefined) {
            pendingCalls.set(callId, ev);
            parsed++;
            yield { kind: 'event', line: lineNo, event: ev };
          } else if ((ev as any).args === undefined && pendingCalls.has(callId)) {
            const prev = pendingCalls.get(callId)!;
            if (prev.type === 'LocalShellCall' && ev.result && typeof ev.result === 'object') {
              const r = ev.result as any;
              if (typeof r.stdout === 'string') (prev as any).stdout = r.stdout;
              if (typeof r.stderr === 'string') (prev as any).stderr = r.stderr;
              if (typeof r.exitCode === 'number') (prev as any).exitCode = r.exitCode;
              else if (typeof r.exit_code === 'number') (prev as any).exitCode = r.exit_code;
              if (typeof r.durationMs === 'number') (prev as any).durationMs = r.durationMs;
              else if (typeof r.duration_ms === 'number') (prev as any).durationMs = r.duration_ms;
              delete (prev as any).result;
            } else {
              (prev as any).result = ev.result;
              if (ev.durationMs !== undefined) (prev as any).durationMs = ev.durationMs;
            }
            pendingCalls.delete(callId);
          } else {
            parsed++;
            yield { kind: 'event', line: lineNo, event: ev };
          }
        } else {
          parsed++;
          yield { kind: 'event', line: lineNo, event: ev };
        }
      } else if (ev.type === 'LocalShellCall') {
        const callId = (ev as any).call_id as string | undefined;
        const hasOutput =
          ev.stdout !== undefined ||
          ev.stderr !== undefined ||
          ev.exitCode !== undefined ||
          ev.durationMs !== undefined;
        if (callId) {
          if (!hasOutput) {
            pendingCalls.set(callId, ev);
            parsed++;
            yield { kind: 'event', line: lineNo, event: ev };
          } else if (pendingCalls.has(callId)) {
            const prev = pendingCalls.get(callId)!;
            Object.assign(prev, ev);
            pendingCalls.delete(callId);
          } else {
            parsed++;
            yield { kind: 'event', line: lineNo, event: ev };
          }
        } else {
          parsed++;
          yield { kind: 'event', line: lineNo, event: ev };
        }
      } else {
        parsed++;
        yield { kind: 'event', line: lineNo, event: ev };
      }
    }
  }

  const ended = performance.now?.() ?? Date.now();
  yield {
    kind: 'done',
    stats: {
      totalLines: total,
      parsedEvents: parsed,
      failedLines: failed,
      durationMs: Math.max(0, ended - started),
    },
  };
}

function parseLineByVersion(
  version: string | number,
  line: string
): SafeResult<ResponseItemParsed> {
  void version;
  return parseResponseItemLine(line);
}

export async function parseSessionToArrays(blob: Blob, opts: ParserOptions = {}) {
  const errors: ParserError[] = [];
  const events: ResponseItemParsed[] = [];
  let meta: SessionMetaParsed | undefined;
  let stats: ParserStats | undefined;

  for await (const item of streamParseSession(blob, opts)) {
    if (item.kind === 'meta') meta = item.meta;
    else if (item.kind === 'event') events.push(item.event);
    else if (item.kind === 'error') errors.push(item.error);
    else if (item.kind === 'done') stats = item.stats;
  }

  return { meta, events, errors, stats };
}
