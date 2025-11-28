import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const DEFAULT_LOG_DIR = process.env.BROWSER_ECHO_LOG_DIR ?? 'logs/frontend'
const DEFAULT_MAX_CHARS = Number(process.env.BROWSER_LOG_MAX_CHARS ?? 40_000)

type BasicLogLevel = 'debug' | 'info' | 'error'

function logDebug(message: string, meta?: unknown) {
  logToConsole('debug', message, meta)
}

function logInfo(message: string, meta?: unknown) {
  logToConsole('info', message, meta)
}

function logError(message: string, meta?: unknown) {
  logToConsole('error', message, meta)
}

function logToConsole(level: BasicLogLevel, message: string, meta?: unknown) {
  const prefix = `[browser-logs] ${message}`
  if (level === 'debug') {
    console.debug(prefix, meta ?? '')
  } else if (level === 'info') {
    console.info(prefix, meta ?? '')
  } else {
    console.error(prefix, meta ?? '')
  }
}

export interface BrowserLogSnapshot {
  text: string
  source: string | null
  truncated: boolean
  updatedAt: string
}

export interface ClearBrowserLogsResult {
  clearedFiles: number
  directory: string
  existed: boolean
}

type BrowserLogLevel = 'debug' | 'info' | 'error'

const logEntrySchema = z.object({
  level: z.enum(['debug', 'info', 'error']),
  scope: z.string(),
  message: z.string(),
  meta: z.any().optional(),
  timestamp: z.string().optional(),
})

let activeLogFile: string | null = null

export async function readBrowserLogSnapshot(
  directory: string = DEFAULT_LOG_DIR,
  maxChars: number = DEFAULT_MAX_CHARS,
): Promise<BrowserLogSnapshot> {
  const [{ resolve, join }, { readdir, readFile }] = await Promise.all([loadPathModule(), loadFsModule()])
  const resolvedDir = resolve(process.cwd(), directory)
  const limit = Number.isFinite(maxChars) && maxChars > 0 ? Math.floor(maxChars) : DEFAULT_MAX_CHARS

  let files: string[]
  try {
    files = (await readdir(resolvedDir)).filter((file) => file.endsWith('.log')).sort()
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      logInfo('browser-logs', 'Log directory missing', { directory: resolvedDir })
      return createEmptySnapshot('Browser log directory not found.')
    }
    logError('browser-logs', 'Failed to read log directory', error as Error)
    throw error
  }

  if (!files.length) {
    logInfo('browser-logs', 'No log files found', { directory: resolvedDir })
    return createEmptySnapshot('No browser logs captured yet.')
  }

  const latest = files[files.length - 1]
  const absolute = join(resolvedDir, latest)
  let raw: string
  try {
    raw = await readFile(absolute, 'utf8')
  } catch (error) {
    logError('browser-logs', 'Failed to read latest log file', { file: absolute, error })
    throw error
  }
  if (!raw) {
    logDebug('browser-logs', 'Latest log file is empty', { file: latest })
    return {
      text: '(log file is empty)',
      source: latest,
      truncated: false,
      updatedAt: new Date().toISOString(),
    }
  }

  const truncated = raw.length > limit
  const text = truncated ? raw.slice(-limit) : raw

  return {
    text,
    source: latest,
    truncated,
    updatedAt: new Date().toISOString(),
  }
}

function createEmptySnapshot(message: string): BrowserLogSnapshot {
  logDebug('browser-logs', 'Returning empty snapshot', { message })
  return {
    text: message,
    source: null,
    truncated: false,
    updatedAt: new Date().toISOString(),
  }
}

export const getBrowserLogs = createServerFn({ method: 'GET' }).handler(async () => {
  logDebug('browser-logs', 'Server function invoked')
  return readBrowserLogSnapshot()
})

export const clearBrowserLogs = createServerFn({ method: 'POST' }).handler(async () => {
  logInfo('browser-logs', 'Clear logs request received')
  const result = await clearBrowserLogFiles()
  logInfo('browser-logs', 'Clear logs completed', { ...result })
  return result
})

export const captureBrowserLog = createServerFn({ method: 'POST' })
  .inputValidator((payload: unknown) => logEntrySchema.parse(payload))
  .handler(async ({ data }) => {
    await recordBrowserLogEntry({
      level: data.level,
      scope: data.scope,
      message: data.message,
      meta: data.meta,
      timestamp: data.timestamp ?? new Date().toISOString(),
    })
    return { ok: true }
  })

export async function recordBrowserLogEntry(entry: {
  level: BrowserLogLevel
  scope: string
  message: string
  meta?: unknown
  timestamp: string
}) {
  const [{ resolve, join }, fs] = await Promise.all([loadPathModule(), loadFsModule()])
  const logDir = resolve(process.cwd(), DEFAULT_LOG_DIR)
  await fs.mkdir(logDir, { recursive: true })
  if (!activeLogFile) {
    activeLogFile = join(logDir, `dev-${new Date().toISOString().replace(/[:.]/g, '-')}.log`)
  }
  const serializedMeta =
    entry.meta === undefined ? '' : typeof entry.meta === 'string' ? entry.meta : JSON.stringify(entry.meta)
  const line = `[${entry.timestamp}] [${entry.scope}] ${entry.level.toUpperCase()}: ${entry.message}${
    serializedMeta ? ` ${serializedMeta}` : ''
  }`
  await fs.appendFile(activeLogFile, `${line}\n`, 'utf8')
}

export async function clearBrowserLogFiles(directory: string = DEFAULT_LOG_DIR): Promise<ClearBrowserLogsResult> {
  const [{ resolve, join }, fs] = await Promise.all([loadPathModule(), loadFsModule()])
  const resolvedDir = resolve(process.cwd(), directory)

  let entries: string[]
  try {
    entries = await fs.readdir(resolvedDir)
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') {
      logDebug('browser-logs', 'Clear requested for missing directory', { directory: resolvedDir })
      return { clearedFiles: 0, directory: resolvedDir, existed: false }
    }
    logError('browser-logs', 'Failed to list directory for clearing', error as Error)
    throw error
  }

  const logFiles = entries.filter((file) => file.endsWith('.log')).map((file) => join(resolvedDir, file))
  if (!logFiles.length) {
    logDebug('browser-logs', 'Clear requested but no log files found', { directory: resolvedDir })
    return { clearedFiles: 0, directory: resolvedDir, existed: true }
  }

  try {
    await Promise.all(logFiles.map((file) => fs.unlink(file)))
  } catch (error) {
    logError('browser-logs', 'Failed to delete log files', error as Error)
    throw error
  }
  activeLogFile = null

  return { clearedFiles: logFiles.length, directory: resolvedDir, existed: true }
}

type FsModule = typeof import('node:fs/promises')
type PathModule = typeof import('node:path')

let cachedFsModule: FsModule | null = null
async function loadFsModule(): Promise<FsModule> {
  if (!cachedFsModule) {
    cachedFsModule = await import('node:fs/promises')
  }
  return cachedFsModule
}

let cachedPathModule: PathModule | null = null
async function loadPathModule(): Promise<PathModule> {
  if (!cachedPathModule) {
    cachedPathModule = await import('node:path')
  }
  return cachedPathModule
}
