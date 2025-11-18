import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DEFAULT_RUNTIME_DIR = 'var/session-uploads'
const DATA_ROOT = process.env.CODEX_SESSION_DB_DIR
  ? resolve(process.env.CODEX_SESSION_DB_DIR)
  : resolve(process.cwd(), DEFAULT_RUNTIME_DIR)
const FILE_STORE_DIR = join(DATA_ROOT, 'files')
const INDEX_FILE = join(DATA_ROOT, 'session-uploads.json')

export interface SessionUploadRecord {
  id: string
  originalName: string
  storedName: string
  storedAt: string
  size: number
  absolutePath: string
  fileUrl: string
}

interface SessionUploadIndexEntry {
  id: string
  originalName: string
  storedName: string
  storedAt: string
  size: number
}

function sanitizeFilename(value: string) {
  const base = value.replace(/[^a-z0-9._-]/gi, '-')
  return base || `session-${Date.now()}`
}

async function ensureStorageDirs() {
  await fs.mkdir(FILE_STORE_DIR, { recursive: true })
  await fs.mkdir(dirname(INDEX_FILE), { recursive: true })
}

async function readIndex(): Promise<SessionUploadIndexEntry[]> {
  try {
    const raw = await fs.readFile(INDEX_FILE, 'utf8')
    return JSON.parse(raw) as SessionUploadIndexEntry[]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return []
    }
    throw error
  }
}

async function writeIndex(entries: SessionUploadIndexEntry[]) {
  await ensureStorageDirs()
  await fs.writeFile(INDEX_FILE, JSON.stringify(entries, null, 2), 'utf8')
}

export async function saveSessionUpload(originalName: string, content: string) {
  await ensureStorageDirs()
  const storedName = `${new Date().toISOString().replace(/[:.]/g, '-')}-${sanitizeFilename(originalName)}`
  const filePath = join(FILE_STORE_DIR, storedName)
  await fs.writeFile(filePath, content, 'utf8')

  const entry: SessionUploadIndexEntry = {
    id: randomUUID(),
    originalName,
    storedName,
    storedAt: new Date().toISOString(),
    size: Buffer.byteLength(content, 'utf8'),
  }

  const entries = await readIndex()
  entries.push(entry)
  await writeIndex(entries)

  return formatRecord(entry, filePath)
}

export async function listSessionUploadRecords(): Promise<SessionUploadRecord[]> {
  await ensureStorageDirs()
  const entries = await readIndex()
  return entries.map((entry) => {
    const filePath = join(FILE_STORE_DIR, entry.storedName)
    return formatRecord(entry, filePath)
  })
}

function formatRecord(entry: SessionUploadIndexEntry, filePath: string): SessionUploadRecord {
  return {
    ...entry,
    absolutePath: filePath,
    fileUrl: pathToFileURL(filePath).toString(),
  }
}
