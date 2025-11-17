import { createServerFn } from '@tanstack/react-start'

const DEFAULT_LOG_DIR = process.env.BROWSER_ECHO_LOG_DIR ?? 'logs/frontend'
const DEFAULT_MAX_CHARS = Number(process.env.BROWSER_LOG_MAX_CHARS ?? 40_000)

export interface BrowserLogSnapshot {
  text: string
  source: string | null
  truncated: boolean
  updatedAt: string
}

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
      return createEmptySnapshot('Browser log directory not found.')
    }
    throw error
  }

  if (!files.length) {
    return createEmptySnapshot('No browser logs captured yet.')
  }

  const latest = files[files.length - 1]
  const absolute = join(resolvedDir, latest)
  const raw = await readFile(absolute, 'utf8')
  if (!raw) {
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
  return {
    text: message,
    source: null,
    truncated: false,
    updatedAt: new Date().toISOString(),
  }
}

export const getBrowserLogs = createServerFn({ method: 'GET' }).handler(async () => {
  return readBrowserLogSnapshot()
})

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
