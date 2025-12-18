import {
  deriveRepoDetailsFromLine,
  deriveSessionTimestampMs,
  type RepoDetails,
} from '~/lib/repo-metadata';
import {
  sortSessionAssets,
  uploadRecordToAsset,
  type DiscoveryInputs,
  type DiscoveryStats,
  type DiscoveredSessionAsset,
  type ProjectDiscoverySnapshot,
  type SessionDirectoryInfo,
} from './viewerDiscovery';
import type { SessionOrigin } from '~/lib/session-origin';

const isServerRuntime = typeof process !== 'undefined' && !!process.versions?.node;

const PROJECT_FILE_INCLUDE_GLOBS = [
  '/.git',
  '/app/**/*',
  '/src/**/*',
  '/scripts/**/*',
  '/public/**/*',
  '/package.json',
  '/tsconfig.json',
];

const PROJECT_FILE_EXCLUDE_GLOBS = [
  '!/src/**/__tests__/**',
  '!/src/**/__mocks__/**',
  '!/src/**/*.test.{ts,tsx,js,jsx}',
  '!/src/**/*.spec.{ts,tsx,js,jsx}',
];

const SESSION_ASSET_GLOBS = [
  '/.codex/sessions/**/*.{jsonl,ndjson,json}',
  '/sessions/**/*.{jsonl,ndjson,json}',
  '/artifacts/sessions/**/*.{jsonl,ndjson,json}',
];

type NodeDeps = {
  fs: typeof import('fs');
  path: typeof import('path');
};

let nodeDepsPromise: Promise<NodeDeps> | null = null;

async function ensureNodeDeps(): Promise<NodeDeps> {
  if (!nodeDepsPromise) {
    nodeDepsPromise = Promise.all([import('fs'), import('path')]).then(([fs, path]) => ({
      fs,
      path,
    }));
  }
  return nodeDepsPromise;
}

function isIgnoredPath(path: string) {
  return (
    /\/(?:__tests__|__mocks__)\//.test(path) || /\.(?:test|spec|stories)\.[a-z0-9]+$/i.test(path)
  );
}
function normalizePaths(raw: string[]) {
  return Array.from(
    new Set(
      raw
        .filter((p) => /\.[a-z0-9]+$/i.test(p))
        .filter((p) => !p.endsWith('.map'))
        .filter((p) => !p.endsWith('.d.ts'))
        .filter((p) => !isIgnoredPath(p))
        .map((p) => p.replace(/^\//, ''))
    )
  ).sort();
}
function extractSortKeyFromPath(path: string) {
  const dateMatch = path.match(/(20\d{2})[-_]?(\d{2})[-_]?(\d{2})/);
  if (dateMatch) {
    const year = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const day = Number(dateMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return Date.UTC(year, month - 1, day);
    }
  }
  const epochMatch = path.match(/(1\d{9}|2\d{9})/);
  if (epochMatch) {
    return Number(epochMatch[1]) * 1000;
  }
  return 0;
}

function getFileSizeFromAbsolutePath(path: string | undefined, deps: NodeDeps | null) {
  if (!deps || !path) return undefined;
  try {
    return deps.fs.statSync(path).size;
  } catch {
    return undefined;
  }
}
/**
 * Build-time discovery of project files and session assets.
 * Runs inside route loaders (rule: fetch on navigation vs. useEffect).
 */
export async function discoverProjectAssets(): Promise<ProjectDiscoverySnapshot> {
  if (!isServerRuntime) {
    throw new Error('discoverProjectAssets must only run on the server runtime');
  }
  const nodeDeps = await ensureNodeDeps();
  const sessionUploads = await ensureSessionUploadsModule();
  const codeGlobs = import.meta.glob(
    [
      '/src/**/*',
      '/scripts/**/*',
      '/public/**/*',
      '/package.json',
      '/tsconfig.json',
      '!/src/**/__tests__/**',
      '!/src/**/__mocks__/**',
      '!/src/**/*.test.{ts,tsx,js,jsx}',
      '!/src/**/*.spec.{ts,tsx,js,jsx}',
    ],
    {
      query: '?url',
      import: 'default',
    }
  );
  const docAssets = import.meta.glob(['/README*'], {
    eager: true,
    query: '?url',
    import: 'default',
  }) as Record<string, string>;
  const projectFiles = normalizePaths([...Object.keys(codeGlobs), ...Object.keys(docAssets)]);
  const sessionMatches = import.meta.glob(
    [
      '/.codex/sessions/**/*.{jsonl,ndjson,json}',
      '/sessions/**/*.{jsonl,ndjson,json}',
      '/artifacts/sessions/**/*.{jsonl,ndjson,json}',
    ],
    {
      eager: true,
      query: '?url',
      import: 'default',
    }
  ) as Record<string, string>;
  const bundledCount = await synchronizeBundledSessions(sessionMatches, nodeDeps, sessionUploads);
  const directories = getExternalSessionDirectories(nodeDeps);
  const externalCount = await synchronizeExternalSessions(nodeDeps, directories, sessionUploads);
  const storedUploads = await discoverStoredSessionAssets(sessionUploads);
  const sessionAssets = sortSessionAssets(storedUploads);
  const stats: DiscoveryStats = {
    bundled: bundledCount,
    external: externalCount,
    uploads: storedUploads.length,
    total: sessionAssets.length,
  };
  const inputs: DiscoveryInputs = {
    projectGlobPatterns: PROJECT_FILE_INCLUDE_GLOBS,
    projectExcludedGlobs: PROJECT_FILE_EXCLUDE_GLOBS,
    bundledSessionGlobs: SESSION_ASSET_GLOBS,
    externalDirectories: directories,
    uploadStores: ['session-uploads-store'],
  };
  return { projectFiles, sessionAssets, generatedAt: Date.now(), stats, inputs };
}

async function synchronizeBundledSessions(
  sessionMatches: Record<string, string>,
  deps: NodeDeps | null,
  sessionUploads: SessionUploadsModule
) {
  if (!deps) return 0;
  await Promise.all(
    Object.entries(sessionMatches).map(async ([path]) => {
      const relativePath = path.replace(/^\//, '');
      const absolutePath = resolveWorkspacePath(relativePath, deps);
      if (!absolutePath) {
        return;
      }
      const repoDetails = await readRepoDetailsFromFile(absolutePath, deps);
      await sessionUploads.ensureSessionUploadForFile({
        relativePath,
        absolutePath,
        repoLabel: repoDetails.repoLabel,
        repoMeta: repoDetails.repoMeta,
        sessionTimestampMs: repoDetails.sessionTimestampMs,
        source: 'bundled',
        origin: 'codex',
      });
    })
  );
  return Object.keys(sessionMatches).length;
}

async function synchronizeExternalSessions(
  deps: NodeDeps | null,
  directories: SessionDirectoryInfo[],
  sessionUploads: SessionUploadsModule
) {
  if (!deps) return 0;
  const { default: fg } = await import('fast-glob');
  let count = 0;
  for (const dirInfo of directories) {
    const globPatterns = deriveGlobPatternsForDirectory(dirInfo)
    const matches = fg.sync(globPatterns, {
      cwd: dirInfo.absolute,
      onlyFiles: true,
      dot: true,
    });
    await Promise.all(
      matches.map(async (relativePath) => {
        const absolutePath = deps.path.resolve(dirInfo.absolute, relativePath);
        const repoDetails = await readRepoDetailsFromFile(absolutePath, deps);
        const relativeDisplayPath = joinDisplayPath(dirInfo.displayPrefix, relativePath);
        await sessionUploads.ensureSessionUploadForFile({
          relativePath: relativeDisplayPath,
          absolutePath,
          repoLabel: repoDetails.repoLabel,
          repoMeta: repoDetails.repoMeta,
          sessionTimestampMs: repoDetails.sessionTimestampMs,
          source: 'external',
          origin: dirInfo.origin,
        });
      })
    );
    count += matches.length;
  }
  return count;
}

function deriveGlobPatternsForDirectory(dirInfo: SessionDirectoryInfo) {
  if (dirInfo.origin === 'gemini-cli' || dirInfo.displayPrefix?.toLowerCase().includes('gemini')) {
    return [
      '**/chats/**/*.{json,jsonl,ndjson}',
      '**/checkpoints/**/*.{json,jsonl,ndjson}',
      '**/session-*.json',
      '**/checkpoint-*.json',
      '**/*.jsonl',
    ]
  }
  return ['**/*.{jsonl,ndjson,json}']
}

function getExternalSessionDirectories(deps: NodeDeps | null): SessionDirectoryInfo[] {
  if (!deps) return [];
  const directories: SessionDirectoryInfo[] = [];
  const seen = new Set<string>();
  const addDir = (dir: string | undefined, displayPrefix?: string, origin?: SessionOrigin) => {
    if (!dir) return;
    const absolute = deps.path.resolve(dir);
    if (!deps.fs.existsSync(absolute)) return;
    if (seen.has(absolute)) return;
    seen.add(absolute);
    directories.push({ absolute, displayPrefix: displayPrefix ?? formatDisplayPrefix(absolute), origin });
  };

  const homeDir = process.env.HOME ?? process.env.USERPROFILE;
  if (homeDir) {
    addDir(deps.path.resolve(homeDir, '.codex/sessions'), '~/.codex/sessions', 'codex');
    addDir(deps.path.resolve(homeDir, '.gemini/tmp'), '~/.gemini/tmp', 'gemini-cli');
  }

  const appendEnvDirectories = (value: string | undefined, prefix?: string, origin?: SessionOrigin) => {
    if (!value) return;
    for (const raw of value.split(deps.path.delimiter)) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      addDir(trimmed, prefix, origin);
    }
  };

  appendEnvDirectories(process.env.CODEX_SESSION_DIR, undefined, 'codex');
  appendEnvDirectories(process.env.GEMINI_SESSION_DIR, 'Gemini sessions', 'gemini-cli');

  return directories;
}

function formatDisplayPrefix(absolute: string) {
  const workspace = normalizeSlashes(process.cwd());
  const normalized = normalizeSlashes(absolute);
  if (normalized.startsWith(workspace)) {
    const remaining = normalized.slice(workspace.length).replace(/^\/+/, '');
    return remaining || '.';
  }
  return normalized;
}

function joinDisplayPath(prefix: string, relativePath: string) {
  const cleanPrefix = prefix.replace(/\\/g, '/').replace(/\/+$/, '');
  const cleanRelative = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  return cleanPrefix ? `${cleanPrefix}/${cleanRelative}` : cleanRelative;
}

function normalizeSlashes(value: string) {
  return value.replace(/\\/g, '/').replace(/\/+$/, '');
}

async function discoverStoredSessionAssets(
  sessionUploads: SessionUploadsModule
): Promise<DiscoveredSessionAsset[]> {
  if (!isServerRuntime) return [];
  const records = await sessionUploads.listSessionUploadRecords();
  return records.map(uploadRecordToAsset);
}

function resolveWorkspacePath(relativePath: string, deps: NodeDeps | null) {
  if (!deps) return undefined;
  return deps.path.resolve(process.cwd(), relativePath.replace(/^\//, ''));
}

type RepoDetailsWithTimestamp = RepoDetails & { sessionTimestampMs?: number };

async function readRepoDetailsFromFile(
  absolutePath: string | undefined,
  deps: NodeDeps | null
): Promise<RepoDetailsWithTimestamp> {
  if (!absolutePath || !deps) return {};
  try {
    const firstLine = await readFirstLine(absolutePath, deps);
    return {
      ...deriveRepoDetailsFromLine(firstLine),
      sessionTimestampMs: deriveSessionTimestampMs(firstLine),
    };
  } catch {
    return {};
  }
}

async function readFirstLine(absolutePath: string, deps: NodeDeps) {
  const handle = await deps.fs.promises.open(absolutePath, 'r');
  const bufferSize = 2048;
  const maxRead = bufferSize * 4;
  let collected = '';
  try {
    while (collected.length < maxRead) {
      const buffer = Buffer.alloc(bufferSize);
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, null);
      if (!bytesRead) break;
      const chunk = buffer.subarray(0, bytesRead).toString('utf8');
      const newlineIndex = chunk.indexOf('\n');
      if (newlineIndex >= 0) {
        collected += chunk.slice(0, newlineIndex);
        return collected.replace(/\r$/, '');
      }
      collected += chunk;
    }
    return collected ? collected.replace(/\r$/, '') : undefined;
  } finally {
    await handle.close();
  }
}
type SessionUploadsModule = typeof import('~/server/persistence/sessionUploads');

let sessionUploadsPromise: Promise<SessionUploadsModule> | null = null;

async function ensureSessionUploadsModule(): Promise<SessionUploadsModule> {
  if (!sessionUploadsPromise) {
    sessionUploadsPromise = import('~/server/persistence/sessionUploads');
  }
  return sessionUploadsPromise;
}
