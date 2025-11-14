import { z, type ZodError } from 'zod';
import {
  ResponseItemSchema,
  SessionMetaSchema,
  type ResponseItemParsed,
  type SessionMetaParsed,
} from './schemas';
import type { MessagePart } from '~/lib/viewer-types/events';

export type ParseFailureReason = 'invalid_json' | 'invalid_schema';

export type SafeResult<T> =
  | { success: true; data: T }
  | { success: false; error: ZodError | SyntaxError; reason: ParseFailureReason };

function tryParseJson(
  line: string
): { success: true; data: unknown } | { success: false; error: SyntaxError } {
  let s = line;
  s = s.replace(/^\uFEFF/, '');
  s = s.replace(/^$$\}'?,?\s*/, '');
  const t = s.trim();
  if (t === '[' || t === ']' || t === '],') {
    return { success: true, data: { __csv_token__: t } };
  }
  try {
    return { success: true, data: JSON.parse(s) };
  } catch (e) {
    if (/[,\s]$/.test(s)) {
      try {
        return { success: true, data: JSON.parse(s.replace(/[\s,]+$/, '')) };
      } catch {}
    }
    return { success: false, error: e as SyntaxError };
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export function parseSessionMetaLine(line: string): SafeResult<SessionMetaParsed> {
  const j = tryParseJson(line);
  if (!j.success) return { success: false, error: j.error, reason: 'invalid_json' };
  let payload: unknown = j.data;
  if (isRecord(payload)) {
    const rt = (payload as any).record_type || (payload as any).recordType;
    if (typeof rt === 'string' && rt.toLowerCase() === 'meta') {
      const inner = (payload as any).record || (payload as any).data || (payload as any).payload;
      if (inner && typeof inner === 'object') payload = inner;
    }
    const t = (payload as any).type;
    if (typeof t === 'string' && t.toLowerCase() === 'session_meta') {
      const inner = (payload as any).payload || (payload as any).data || (payload as any).record;
      if (inner && typeof inner === 'object') payload = inner;
    }
  }
  const res = SessionMetaSchema.safeParse(payload);
  if (!res.success) return { success: false, error: res.error, reason: 'invalid_schema' };
  return { success: true, data: res.data };
}

export function parseResponseItemLine(line: string): SafeResult<ResponseItemParsed> {
  const j = tryParseJson(line);
  if (!j.success) return { success: false, error: j.error, reason: 'invalid_json' };

  let payload: unknown = j.data;
  if (isRecord(payload)) {
    const rt = (payload as any).record_type || (payload as any).recordType;
    if (typeof rt === 'string') {
      const rtl = rt.toLowerCase();
      if (rtl === 'event' || rtl === 'trace' || rtl === 'log') {
        const inner =
          (payload as any).record ||
          (payload as any).event ||
          (payload as any).payload ||
          (payload as any).data ||
          (payload as any).item;
        if (inner && typeof inner === 'object') payload = inner;
      } else if (rtl === 'state') {
        const fallback = { type: 'Other', data: payload };
        const alt = ResponseItemSchema.safeParse(fallback);
        if (alt.success) return { success: true, data: alt.data };
      }
    }
    const t = (payload as any).type;
    if (typeof t === 'string') {
      const tl = t.toLowerCase();
      if (tl === 'response_item' || tl === 'event_msg') {
        const inner =
          (payload as any).payload ||
          (payload as any).data ||
          (payload as any).record ||
          (payload as any).event ||
          (payload as any).item;
        if (inner && typeof inner === 'object') {
          if (typeof (payload as any).timestamp === 'string' && !(inner as any).at) {
            (inner as any).at = (payload as any).timestamp;
          }
          payload = inner;
        }
      }
    }
  }

  if (isRecord(payload)) {
    const normalized = normalizeForeignEventShape(payload);
    if (normalized) {
      const normRes = ResponseItemSchema.safeParse(normalized);
      if (normRes.success) return { success: true, data: normRes.data };
    }
  }

  const res = ResponseItemSchema.safeParse(payload);
  if (res.success) return { success: true, data: res.data };

  if (isRecord(payload)) {
    const base = payload;
    const t = typeof (base as any).type === 'string' ? (base as any).type : undefined;
    const known = [
      'Message',
      'Reasoning',
      'FunctionCall',
      'LocalShellCall',
      'WebSearchCall',
      'CustomToolCall',
      'FileChange',
      'Other',
    ];
    if (!t || !known.includes(t)) {
      const fallback = {
        type: 'Other',
        id: typeof base.id === 'string' ? base.id : undefined,
        at: typeof base.at === 'string' ? base.at : undefined,
        index: typeof base.index === 'number' ? base.index : undefined,
        data: base,
      };
      const alt = ResponseItemSchema.safeParse(fallback);
      if (alt.success) return { success: true, data: alt.data };
    }
  }

  return { success: false, error: res.error, reason: 'invalid_schema' };
}

function asString(v: unknown): string | undefined {
  if (typeof v === 'string') return v;
  if (v == null) return undefined;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function toCamel<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const ck = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[ck] = v;
  }
  return out as T;
}

function flattenContent(content: unknown): string | undefined;
function flattenContent(content: unknown, preserveArray: false): string | undefined;
function flattenContent(content: unknown, preserveArray: true): string | MessagePart[] | undefined;
function flattenContent(
  content: unknown,
  preserveArray = false
): string | MessagePart[] | undefined {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    const parts: MessagePart[] = [];
    for (const b of content) {
      if (b && typeof b === 'object' && 'text' in (b as any)) {
        parts.push({ type: 'text', text: String((b as any).text) });
      } else {
        const text = asString(b);
        if (text != null) parts.push({ type: 'text', text });
      }
    }
    return preserveArray ? parts : parts.map((p) => p.text).join('\n');
  }
  return asString(content);
}

function extractReasoningContent(src: Record<string, any>): string | null {
  let content = flattenContent(src.content);
  if (typeof content === 'string' && content.trim() !== '') return content;
  const summary = flattenContent(src.summary);
  if (typeof summary === 'string' && summary.trim() !== '') return summary;
  if ('encryptedContent' in src) return '[encrypted]';
  return null;
}

function tryParseJsonText(s?: string): unknown {
  if (!s) return undefined;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}

function extractMessageFromResponse(resp: any): string | undefined {
  if (!resp || typeof resp !== 'object') return undefined;
  if (Array.isArray(resp.output_text) && resp.output_text.length) {
    return resp.output_text
      .map((x: any) => (typeof x === 'string' ? x : (asString(x) ?? '')))
      .join('\n');
  }
  if (Array.isArray(resp.output)) {
    const parts: string[] = [];
    for (const seg of resp.output) {
      if (Array.isArray(seg?.content)) {
        for (const item of seg.content) {
          if (item && typeof item === 'object') {
            if ('text' in item && typeof item.text === 'string') parts.push(item.text);
            else if ('type' in item && item.type === 'tool_output') {
              const text = asString(item.output_text ?? item.output);
              if (text) parts.push(text);
            }
          }
        }
      }
    }
    if (parts.length) return parts.join('\n');
  }
  if (typeof resp.text === 'string') return resp.text;
  if (Array.isArray(resp.text)) {
    return resp.text.map((x: any) => (typeof x === 'string' ? x : (asString(x) ?? ''))).join('\n');
  }
  return undefined;
}

function normalizeForeignEventShape(payload: Record<string, any>) {
  const next = toCamel(payload);
  const type =
    typeof next.type === 'string'
      ? next.type
      : typeof next.eventType === 'string'
        ? next.eventType
        : undefined;
  if (!type) return null;
  const normalized: Record<string, any> = { ...next, type };

  if (type === 'message' || type === 'chat_message') {
    normalized.type = 'Message';
    normalized.role = next.role ?? next.author ?? 'assistant';
    if (typeof next.content === 'string') normalized.content = next.content;
    else if (Array.isArray(next.content)) normalized.content = flattenContent(next.content, true);
    else normalized.content = flattenContent(next.body, true) ?? flattenContent(next.payload);
    if (!normalized.content) normalized.content = extractMessageFromResponse(next.response);
    if (!normalized.content && typeof next.response_text === 'string')
      normalized.content = next.response_text;
    normalized.model = next.model ?? next.engine;
  } else if (type === 'reasoning' || type === 'thought') {
    normalized.type = 'Reasoning';
    const content = extractReasoningContent(next);
    if (content) normalized.content = content;
  } else if (type === 'tool_call' || type === 'function_call') {
    normalized.type = 'FunctionCall';
    normalized.name = next.toolName ?? next.functionName ?? next.name ?? 'call';
    normalized.args = next.args ?? tryParseJsonText(next.arguments);
    normalized.result = next.result ?? next.output ?? tryParseJsonText(next.response);
    normalized.durationMs = next.durationMs ?? next.latencyMs ?? next.duration;
  } else if (type === 'shell' || type === 'command') {
    normalized.type = 'LocalShellCall';
    normalized.command = next.command ?? next.cmd ?? '';
    normalized.cwd = next.cwd ?? next.directory;
    normalized.stdout = next.stdout ?? next.output ?? extractMessageFromResponse(next.response);
    normalized.stderr = next.stderr;
    normalized.exitCode = next.exitCode ?? next.code;
    normalized.durationMs = next.durationMs ?? next.runtimeMs;
  } else if (type === 'file_change' || type === 'diff') {
    normalized.type = 'FileChange';
    normalized.path = next.path ?? next.file ?? next.filePath ?? 'unknown';
    normalized.diff = next.diff ?? next.patch ?? next.content;
  } else if (type === 'web_search') {
    normalized.type = 'WebSearchCall';
    normalized.query = next.query ?? next.prompt ?? '';
    normalized.provider = next.provider ?? next.engine;
    normalized.results = Array.isArray(next.results) ? next.results : undefined;
  } else if (type === 'custom_tool') {
    normalized.type = 'CustomToolCall';
    normalized.toolName = next.toolName ?? next.name ?? 'tool';
    normalized.input = next.input ?? next.payload;
    normalized.output = next.output ?? next.result;
  } else {
    return null;
  }

  return normalized;
}
