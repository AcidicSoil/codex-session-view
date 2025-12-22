import fs from 'node:fs'
import path from 'node:path'
import type { SessionUploadRecord } from './sessionUploads.types'
import { normalizeUploadRecord } from './sessionUploads.utils'

const DATA_DIR = path.join(process.cwd(), 'data')
const SESSION_UPLOADS_FILE = path.join(DATA_DIR, 'session-uploads.json')

export function resolveUploadStorageDir() {
  const envOverride = process.env.CODEX_SESSION_UPLOAD_DIR
  if (envOverride && envOverride.trim().length > 0) {
    return path.resolve(envOverride.trim())
  }
  const homeDir = process.env.HOME ?? process.env.USERPROFILE
  if (homeDir) {
    return path.join(homeDir, '.codex', 'sessions', 'uploads')
  }
  return path.join(process.cwd(), 'data', 'uploads')
}

export function getUploadsDataDir() {
  return DATA_DIR
}

export function getUploadsFilePath() {
  return SESSION_UPLOADS_FILE
}

export function loadPersistedUploads(): SessionUploadRecord[] {
  try {
    if (!fs.existsSync(SESSION_UPLOADS_FILE)) {
      return []
    }
    const raw = fs.readFileSync(SESSION_UPLOADS_FILE, 'utf8')
    if (!raw.trim()) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map((record) => normalizeUploadRecord(record)).filter(Boolean) as SessionUploadRecord[]
  } catch {
    return []
  }
}

export async function writeUploadToDisk(targetDir: string, originalName: string, content: string) {
  const safeName = originalName.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'session'
  const filename = `${Date.now().toString(36)}-${safeName}`
  await fs.promises.mkdir(targetDir, { recursive: true })
  const targetPath = path.join(targetDir, filename)
  await fs.promises.writeFile(targetPath, content, 'utf8')
  const stat = await fs.promises.stat(targetPath)
  return { sourcePath: targetPath, sourceUpdatedAt: stat.mtimeMs }
}
