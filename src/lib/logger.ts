type LogMeta = Record<string, unknown> | Error | string | number | boolean | null | undefined
type LogLevel = 'debug' | 'info' | 'error'

function formatPrefix(scope: string) {
  return `[codex:${scope}]`
}

export function logDebug(scope: string, message: string, meta?: LogMeta) {
  emit('debug', scope, message, meta)
}

export function logInfo(scope: string, message: string, meta?: LogMeta) {
  emit('info', scope, message, meta)
}

export function logError(scope: string, message: string, meta?: LogMeta) {
  emit('error', scope, message, meta)
}

function emit(level: LogLevel, scope: string, message: string, meta?: LogMeta) {
  const prefix = `${formatPrefix(scope)} ${message}`
  const payload = meta === undefined ? [] : [meta]

  if (level === 'debug') {
    console.debug(prefix, ...payload)
  } else if (level === 'info') {
    console.info(prefix, ...payload)
  } else {
    console.error(prefix, ...payload)
  }

  forwardToServer(level, scope, message, meta)
}

function forwardToServer(level: LogLevel, scope: string, message: string, meta?: LogMeta) {
  const normalizedMeta = serializeMeta(meta)
  if (typeof window === 'undefined') {
    queueMicrotask(() => {
      ensureServerLogWriter()
        .then((writer) => writer({ level, scope, message, meta: normalizedMeta, timestamp: new Date().toISOString() }))
        .catch(() => {})
    })
    return
  }

  queueMicrotask(() => {
    ensureCaptureBrowserLog()
      .then((capture) =>
        capture({
          data: {
            level,
            scope,
            message,
            meta: normalizedMeta,
            timestamp: new Date().toISOString(),
          },
        }),
      )
      .catch(() => {
        // swallow network errors
      })
  })
}

function serializeMeta(meta?: LogMeta) {
  if (meta == null) return meta ?? undefined
  if (meta instanceof Error) {
    return {
      name: meta.name,
      message: meta.message,
      stack: meta.stack,
    }
  }
  if (typeof meta === 'object') {
    try {
      return JSON.parse(JSON.stringify(meta))
    } catch {
      return String(meta)
    }
  }
  return meta
}

type CaptureFn = (payload: { data: { level: LogLevel; scope: string; message: string; meta?: unknown; timestamp: string } }) => Promise<unknown>

let captureBrowserLogPromise: Promise<CaptureFn> | null = null

function ensureCaptureBrowserLog(): Promise<CaptureFn> {
  if (!captureBrowserLogPromise) {
    captureBrowserLogPromise = import('~/server/function/browserLogs').then((mod) => mod.captureBrowserLog as CaptureFn)
  }
  return captureBrowserLogPromise
}

type ServerLogWriter = (entry: { level: LogLevel; scope: string; message: string; meta?: unknown; timestamp: string }) => Promise<void>
let serverLogWriterPromise: Promise<ServerLogWriter> | null = null

function ensureServerLogWriter(): Promise<ServerLogWriter> {
  if (!serverLogWriterPromise) {
    serverLogWriterPromise = import('~/server/function/browserLogs').then((mod) => mod.recordBrowserLogEntry as ServerLogWriter)
  }
  return serverLogWriterPromise
}
