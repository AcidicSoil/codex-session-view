import { appendFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import type { ServerLogEntry } from './logger.types'

const SERVER_LOG_DIR = process.env.SERVER_LOG_DIR ?? 'logs'
const SERVER_LOG_FILE = process.env.SERVER_LOG_FILE ?? 'dev.log'

export async function appendServerLog(entry: ServerLogEntry) {
  const dir = path.resolve(process.cwd(), SERVER_LOG_DIR)
  await mkdir(dir, { recursive: true })
  const filePath = path.join(dir, SERVER_LOG_FILE)
  const timestamp = new Date().toISOString()
  const metaFragment = entry.meta === undefined ? '' : ` ${JSON.stringify(entry.meta)}`
  const line = `[${timestamp}] [${entry.scope}] ${entry.level.toUpperCase()}: ${entry.message}${metaFragment}`
  await appendFile(filePath, `${line}\n`, 'utf8')
}
