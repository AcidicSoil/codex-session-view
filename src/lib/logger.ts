import { createIsomorphicFn, createServerOnlyFn } from '@tanstack/react-start'

import type { BrowserLogPayload, LogLevel, LogMeta, ServerLogEntry } from './logger.types'

const appendServerLog = createServerOnlyFn(async (entry: ServerLogEntry) => {
  const { appendServerLog: appendServerLogServer } = await import('./logger.server')
  return appendServerLogServer(entry)
})

const forwardBrowserLog = createIsomorphicFn()
  .server(() => undefined)
  .client(async (payload: BrowserLogPayload) => {
    const { forwardBrowserLog: forwardBrowserLogClient } = await import('./logger.client')
    return forwardBrowserLogClient(payload)
  })

function formatPrefix(scope: string) {
  return `[codex:${scope}]`
}

export function logDebug(scope: string, message: string, meta?: LogMeta) {
  emit('debug', scope, message, meta)
}

export function logInfo(scope: string, message: string, meta?: LogMeta) {
  emit('info', scope, message, meta)
}

export function logWarn(scope: string, message: string, meta?: LogMeta) {
  emit('warn', scope, message, meta)
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
  } else if (level === 'warn') {
    console.warn(prefix, ...payload)
  } else {
    console.error(prefix, ...payload)
  }

  if (typeof window === 'undefined' && level === 'error') {
    const serialized = serializeMeta(meta)
    queueMicrotask(() => {
      appendServerLog({ level, scope, message, meta: serialized }).catch(() => {})
    })
  }

  forwardToServer(level, scope, message, meta)
}

function forwardToServer(level: LogLevel, scope: string, message: string, meta?: LogMeta) {
  const payload: BrowserLogPayload = {
    level,
    scope,
    message,
    meta: serializeMeta(meta),
    timestamp: new Date().toISOString(),
  }

  if (typeof window === 'undefined') {
    return
  }

  queueMicrotask(() => {
    try {
      Promise.resolve(forwardBrowserLog(payload)).catch(() => {
        // swallow network errors
      })
    } catch {
      // swallow sync errors
    }
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
