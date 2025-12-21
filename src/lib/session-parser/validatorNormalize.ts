import {
  asString,
  extractMessageFromResponse,
  extractReasoningContent,
  flattenContent,
  isRecord,
  toCamel,
  tryParseJsonText,
} from './validatorHelpers'

export function normalizeForeignEventShape(data: Record<string, unknown>): Record<string, unknown> | null {
  const base = toCamel(data)
  const rawTypeCandidate = [
    (base as any).type,
    (base as any).eventType,
    (base as any).event,
    (base as any).kind,
    (base as any).action,
    (base as any).category,
  ].find((v) => typeof v === 'string') as string | undefined
  const t = rawTypeCandidate
    ? String(rawTypeCandidate)
        .toLowerCase()
        .replace(/[-\s]+/g, '_')
        .split(/[.:/]/)[0]
    : undefined

  if (!t && typeof (base as any).record_type === 'string') {
    return { type: 'Other', id: asString(base.id), at: asString(base.at), index: (base as any).index, data }
  }

  switch (t) {
    case 'agent_reasoning': {
      const content = extractReasoningContent({
        content: (base as any).text ?? (base as any).content,
        summary: (base as any).summary,
        encryptedContent: (base as any).encryptedContent,
      })
      if (content == null) return null
      return { type: 'Reasoning', content, id: base.id, at: base.at, index: base.index }
    }
    case 'agent_message': {
      const content = flattenContent((base as any).message ?? (base as any).text ?? (base as any).content, true)
      if (content == null) return null
      const model = typeof (base as any).model === 'string' ? (base as any).model : undefined
      return { type: 'Message', role: 'assistant', content, model, id: base.id, at: base.at, index: base.index }
    }
    case 'summary_text': {
      const content = flattenContent((base as any).text ?? (base as any).content, true)
      if (content == null) return null
      return { type: 'Message', role: 'assistant', content, id: base.id, at: base.at, index: base.index }
    }
    case 'tool_call':
    case 'functioncall':
    case 'function_call': {
      const callId = asString((base as any).call_id) ?? asString((base as any).callId)
      const name = asString((base as any).tool) ?? asString((base as any).name) ?? 'tool'
      if (name === 'shell') {
        const argsRaw = (base as any).arguments ?? (base as any).args
        const parsed = typeof argsRaw === 'string' ? tryParseJsonText(argsRaw) : argsRaw
        const argObj = isRecord(parsed) ? parsed : undefined
        const command = asString(argObj?.command) ?? ''
        const cwd = asString(argObj?.cwd)
        return {
          type: 'LocalShellCall',
          command,
          cwd,
          id: callId ?? base.id,
          call_id: callId,
          at: base.at,
          index: base.index,
        }
      }
      return {
        type: 'FunctionCall',
        name,
        args: (base as any).args ?? (base as any).arguments,
        result: (base as any).output ?? (base as any).result,
        id: callId ?? base.id,
        call_id: callId,
        at: base.at,
        index: base.index,
      }
    }
    case 'tool_call_output':
    case 'function_call_output':
    case 'tool_result': {
      const name = asString((base as any).tool) ?? asString((base as any).name) ?? 'tool'
      const callId = asString((base as any).call_id) ?? asString((base as any).callId)
      const rawVal = (base as any).output ?? (base as any).result
      if (name === 'shell') {
        const parsed = typeof rawVal === 'string' ? tryParseJsonText(rawVal) : rawVal
        const out = isRecord(parsed) ? parsed : { stdout: parsed }
        const exitCode = typeof (out as any).exitCode === 'number'
          ? (out as any).exitCode
          : typeof (out as any).exit_code === 'number'
          ? (out as any).exit_code
          : undefined
        const durationMs = typeof (out as any).durationMs === 'number'
          ? (out as any).durationMs
          : typeof (out as any).duration_ms === 'number'
          ? (out as any).duration_ms
          : undefined
        return {
          type: 'LocalShellCall',
          command: asString((out as any).command) ?? '',
          cwd: asString((out as any).cwd),
          stdout: asString((out as any).stdout),
          stderr: asString((out as any).stderr),
          exitCode,
          durationMs,
          id: callId ?? base.id,
          call_id: callId,
          at: base.at,
          index: base.index,
        }
      }
      const raw = asString(rawVal)
      const parsed = tryParseJsonText(raw)
      let result: unknown = parsed
      if (
        Array.isArray(parsed) &&
        parsed.every((x) => x && typeof x === 'object' && 'text' in (x as any))
      ) {
        result = (parsed as any[]).map((x) => (x as any).text).join('\n')
      }
      return { type: 'FunctionCall', name, result, id: callId ?? base.id, call_id: callId, at: base.at, index: base.index }
    }
    case 'message': {
      const role = typeof base.role === 'string' ? base.role : 'assistant'
      let content = flattenContent((base as any).content, true)
      if (content == null) content = extractMessageFromResponse((base as any).response)
      if (content == null) return null
      const model = typeof (base as any).model === 'string' ? (base as any).model : undefined
      return { type: 'Message', role, content, model, id: base.id, at: base.at, index: base.index }
    }
    case 'assistant_message':
    case 'user_message':
    case 'system_message':
    case 'assistant':
    case 'user':
    case 'system': {
      const role = t === 'assistant_message' || t === 'assistant' ? 'assistant' : t === 'user_message' || t === 'user' ? 'user' : 'system'
      const content = flattenContent((base as any).content ?? (base as any).text ?? (base as any).message, true)
      if (content == null) return null
      const model = typeof (base as any).model === 'string' ? (base as any).model : undefined
      return { type: 'Message', role, content, model, id: base.id, at: base.at, index: base.index }
    }
    case 'reasoning': {
      const content = extractReasoningContent(base as any)
      if (content == null) return null
      return { type: 'Reasoning', content, id: base.id, at: base.at, index: base.index }
    }
    case 'local_shell_call': {
      const exitCode = typeof (base as any).exitCode === 'number'
        ? (base as any).exitCode
        : typeof (base as any).exit_code === 'number'
        ? (base as any).exit_code
        : undefined
      const durationMs = typeof (base as any).durationMs === 'number'
        ? (base as any).durationMs
        : typeof (base as any).duration_ms === 'number'
        ? (base as any).duration_ms
        : undefined
      return {
        type: 'LocalShellCall',
        command: String((base as any).command ?? ''),
        cwd: asString((base as any).cwd),
        exitCode,
        stdout: asString((base as any).stdout),
        stderr: asString((base as any).stderr),
        durationMs,
        id: base.id,
        at: base.at,
        index: base.index,
      }
    }
    case 'web_search_call': {
      const results = Array.isArray((base as any).results) ? (base as any).results as any[] : undefined
      return {
        type: 'WebSearchCall',
        query: String((base as any).query ?? ''),
        provider: asString((base as any).provider),
        results: results?.map((r) => ({ title: asString((r as any).title), url: asString((r as any).url), snippet: asString((r as any).snippet) })),
        id: base.id,
        at: base.at,
        index: base.index,
      }
    }
    case 'custom_tool_call': {
      return {
        type: 'CustomToolCall',
        toolName: asString((base as any).toolName) ?? asString((base as any).name) ?? 'tool',
        input: (base as any).input,
        output: (base as any).output,
        id: base.id,
        at: base.at,
        index: base.index,
      }
    }
    case 'file_change': {
      return {
        type: 'FileChange',
        path: asString((base as any).path) ?? '',
        diff: asString((base as any).diff ?? (base as any).patch),
        id: base.id,
        at: base.at,
        index: base.index,
      }
    }
    case 'file_write':
    case 'file_written':
    case 'file_update':
    case 'file_updated':
    case 'patch':
    case 'diff': {
      return {
        type: 'FileChange',
        path: asString((base as any).path ?? (base as any).file ?? (base as any).filename) ?? '',
        diff: asString((base as any).diff ?? (base as any).patch ?? (base as any).output ?? (base as any).result),
        id: base.id,
        at: base.at,
        index: base.index,
      }
    }
  }

  try {
    if (
      typeof (base as any).path === 'string' &&
      (typeof (base as any).diff === 'string' || typeof (base as any).patch === 'string')
    ) {
      return { type: 'FileChange', path: String((base as any).path), diff: asString((base as any).diff ?? (base as any).patch), id: base.id, at: base.at, index: base.index }
    }
    if (typeof (base as any).command === 'string') {
      const exitCode = typeof (base as any).exitCode === 'number'
        ? (base as any).exitCode
        : typeof (base as any).exit_code === 'number'
        ? (base as any).exit_code
        : undefined
      const durationMs = typeof (base as any).durationMs === 'number'
        ? (base as any).durationMs
        : typeof (base as any).duration_ms === 'number'
        ? (base as any).duration_ms
        : undefined
      return { type: 'LocalShellCall', command: String((base as any).command), cwd: asString((base as any).cwd), exitCode, stdout: asString((base as any).stdout), stderr: asString((base as any).stderr), durationMs, id: base.id, at: base.at, index: base.index }
    }
    if (typeof (base as any).query === 'string' && Array.isArray((base as any).results)) {
      const results = (base as any).results as any[]
      return {
        type: 'WebSearchCall',
        query: String((base as any).query),
        provider: asString((base as any).provider),
        results: results?.map((r) => ({ title: asString((r as any).title), url: asString((r as any).url), snippet: asString((r as any).snippet) })),
        id: base.id,
        at: base.at,
        index: base.index,
      }
    }
    if (
      (typeof (base as any).toolName === 'string' || typeof (base as any).name === 'string') &&
      ((base as any).args != null || (base as any).result != null || (base as any).output != null)
    ) {
      const callId = asString((base as any).call_id) ?? asString((base as any).callId)
      return {
        type: 'FunctionCall',
        name: asString((base as any).toolName) ?? asString((base as any).name) ?? 'tool',
        args: (base as any).args,
        result: (base as any).result ?? (base as any).output,
        id: callId ?? base.id,
        call_id: callId,
        at: base.at,
        index: base.index,
      }
    }
    if (typeof (base as any).role === 'string' && ((base as any).content != null || (base as any).text != null)) {
      const content = flattenContent((base as any).content ?? (base as any).text, true)
      if (content != null) return { type: 'Message', role: String((base as any).role), content, id: base.id, at: base.at, index: base.index }
    }
  } catch {}
  return null
}

export function coerceCsvToken(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    '__csv_token__' in value &&
    typeof (value as any).__csv_token__ === 'string'
  ) {
    return (value as any).__csv_token__ as string
  }
  return null
}
