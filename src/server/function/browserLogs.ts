import { createServerFn, createServerOnlyFn } from '@tanstack/react-start'
import { z } from 'zod'

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

type BrowserLogLevel = 'debug' | 'info' | 'warn' | 'error'

export const browserLogEntrySchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  scope: z.string(),
  message: z.string(),
  meta: z.any().optional(),
  timestamp: z.string().optional(),
})

const loadBrowserLogsServer = createServerOnlyFn(() => import('./browserLogs.server'))

export async function readBrowserLogSnapshot(
  directory?: string,
  maxChars?: number,
): Promise<BrowserLogSnapshot> {
  const { readBrowserLogSnapshot: readSnapshot } = await loadBrowserLogsServer()
  return readSnapshot(directory, maxChars)
}

export async function recordBrowserLogEntry(entry: {
  level: BrowserLogLevel
  scope: string
  message: string
  meta?: unknown
  timestamp: string
}) {
  const { recordBrowserLogEntry: recordEntry } = await loadBrowserLogsServer()
  return recordEntry(entry)
}

export async function clearBrowserLogFiles(directory?: string): Promise<ClearBrowserLogsResult> {
  const { clearBrowserLogFiles: clearFiles } = await loadBrowserLogsServer()
  return clearFiles(directory)
}

export const getBrowserLogs = createServerFn({ method: 'GET' }).handler(async () => {
  return readBrowserLogSnapshot()
})

export const clearBrowserLogs = createServerFn({ method: 'POST' }).handler(async () => {
  const result = await clearBrowserLogFiles()
  return result
})

export const captureBrowserLog = createServerFn({ method: 'POST' })
  .inputValidator((payload: unknown) => browserLogEntrySchema.parse(payload))
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
