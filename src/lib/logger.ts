import { captureBrowserLog } from '~/server/function/browserLogs'

type LogMeta = Record<string, unknown> | Error | string | number | boolean | null | undefined
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const SERVER_LOG_DIR = process.env.SERVER_LOG_DIR ?? 'logs'
const SERVER_LOG_FILE = process.env.SERVER_LOG_FILE ?? 'dev.log'

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
  const payload = {
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
    captureBrowserLog({ data: payload }).catch(() => {
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

interface ServerLogEntry {
  level: LogLevel
  scope: string
  message: string
  meta?: unknown
}

let fsModulePromise: Promise<typeof import('node:fs/promises')> | null = null
let pathModulePromise: Promise<typeof import('node:path')> | null = null

async function appendServerLog(entry: ServerLogEntry) {
  if (!fsModulePromise) {
    fsModulePromise = import('node:fs/promises')
  }
  if (!pathModulePromise) {
    pathModulePromise = import('node:path')
  }
  const [{ mkdir, appendFile }, pathModule] = await Promise.all([fsModulePromise, pathModulePromise])
  const dir = pathModule.resolve(process.cwd(), SERVER_LOG_DIR)
  await mkdir(dir, { recursive: true })
  const filePath = pathModule.join(dir, SERVER_LOG_FILE)
  const timestamp = new Date().toISOString()
  const metaFragment = entry.meta === undefined ? '' : ` ${JSON.stringify(entry.meta)}`
  const line = `[${timestamp}] [${entry.scope}] ${entry.level.toUpperCase()}: ${entry.message}${metaFragment}`
  await appendFile(filePath, `${line}\n`, 'utf8')
}
