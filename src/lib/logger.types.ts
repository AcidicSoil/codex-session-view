export type LogMeta =
  | Record<string, unknown>
  | Error
  | string
  | number
  | boolean
  | null
  | undefined

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ServerLogEntry {
  level: LogLevel
  scope: string
  message: string
  meta?: unknown
}

export interface BrowserLogPayload {
  level: LogLevel
  scope: string
  message: string
  meta?: unknown
  timestamp: string
}
