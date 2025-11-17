const isServerRuntime = typeof process !== 'undefined' && !!process.versions?.node;

type NodeDeps = {
  fs: typeof import('fs');
  path: typeof import('path');
  url: typeof import('url');
};

let nodeDepsPromise: Promise<NodeDeps> | null = null;

async function ensureNodeDeps(): Promise<NodeDeps> {
  if (!nodeDepsPromise) {
    nodeDepsPromise = Promise.all([import('fs'), import('path'), import('url')]).then(([fs, path, url]) => ({
      fs,
      path,
      url,
    }));
  }
  return nodeDepsPromise;
}

export interface DiscoveredSessionAsset {
  path: string;
  url: string;
  sortKey?: number;
  size?: number;
  tags?: readonly string[];
}
export interface ProjectDiscoverySnapshot {
  projectFiles: string[];
  sessionAssets: DiscoveredSessionAsset[];
  generatedAt: number;
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

function getFileSizeFromAbsolutePath(path: string, deps: NodeDeps | null) {
  if (!deps) return undefined;
  try {
    return deps.fs.statSync(path).size;
  } catch {
    return undefined;
  }
}

function getFileSizeFromGlobPath(path: string, deps: NodeDeps | null) {
  if (!deps) return undefined;
  const absolutePath = deps.path.resolve(process.cwd(), path.replace(/^\//, ''));
  return getFileSizeFromAbsolutePath(absolutePath, deps);
}
/**
 * Build-time discovery of project files and session assets.
 * Runs inside route loaders (rule: fetch on navigation vs. useEffect).
 */
export async function discoverProjectAssets(): Promise<ProjectDiscoverySnapshot> {
  const nodeDeps = isServerRuntime ? await ensureNodeDeps() : null;
  const codeGlobs = import.meta.glob([
    '/src/**/*',
    '/scripts/**/*',
    '/public/**/*',
    '/package.json',
    '/tsconfig.json',
    '!/src/**/__tests__/**',
    '!/src/**/__mocks__/**',
    '!/src/**/*.test.{ts,tsx,js,jsx}',
    '!/src/**/*.spec.{ts,tsx,js,jsx}',
    '!/src/**/*.stories.{ts,tsx,js,jsx}',
  ]);
  const docAssets = import.meta.glob(['/README*', '/AGENTS.md'], {
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
  const bundledSessions = Object.entries(sessionMatches).map(([path, url]) => ({
    path: path.replace(/^\//, ''),
    url,
    sortKey: extractSortKeyFromPath(path),
    size: getFileSizeFromGlobPath(path, nodeDeps),
  }));
  const externalSessions = await discoverExternalSessionAssets(nodeDeps);
  const sessionAssets = sortSessionAssets(mergeSessionAssets(bundledSessions, externalSessions));
  return { projectFiles, sessionAssets, generatedAt: Date.now() };
}

function mergeSessionAssets(...lists: DiscoveredSessionAsset[][]) {
  const map = new Map<string, DiscoveredSessionAsset>();
  for (const list of lists) {
    for (const asset of list) {
      map.set(asset.path, asset);
    }
  }
  return Array.from(map.values());
}

function sortSessionAssets(assets: DiscoveredSessionAsset[]) {
  return [...assets].sort((a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0) || a.path.localeCompare(b.path));
}

async function discoverExternalSessionAssets(deps: NodeDeps | null): Promise<DiscoveredSessionAsset[]> {
  if (!deps) return [];
  const { default: fg } = await import('fast-glob');
  const directories = getExternalSessionDirectories(deps);
  const assets: DiscoveredSessionAsset[] = [];
  for (const dirInfo of directories) {
    const matches = fg.sync('**/*.{jsonl,ndjson,json}', {
      cwd: dirInfo.absolute,
      onlyFiles: true,
      dot: true,
    });
    for (const relativePath of matches) {
      const absolutePath = deps.path.resolve(dirInfo.absolute, relativePath);
      assets.push({
        path: joinDisplayPath(dirInfo.displayPrefix, relativePath),
        url: deps.url.pathToFileURL(absolutePath).toString(),
        sortKey: extractSortKeyFromPath(relativePath),
        size: getFileSizeFromAbsolutePath(absolutePath, deps),
      });
    }
  }
  return assets;
}

interface SessionDirectoryInfo {
  absolute: string;
  displayPrefix: string;
}

function getExternalSessionDirectories(deps: NodeDeps): SessionDirectoryInfo[] {
  const directories: SessionDirectoryInfo[] = [];
  const seen = new Set<string>();
  const addDir = (dir: string | undefined, displayPrefix?: string) => {
    if (!dir) return;
    const absolute = deps.path.resolve(dir);
    if (!deps.fs.existsSync(absolute)) return;
    if (seen.has(absolute)) return;
    seen.add(absolute);
    directories.push({ absolute, displayPrefix: displayPrefix ?? formatDisplayPrefix(absolute) });
  };

  const homeDir = process.env.HOME ?? process.env.USERPROFILE;
  if (homeDir) {
    addDir(deps.path.resolve(homeDir, '.codex/sessions'), '~/.codex/sessions');
  }

  const envValue = process.env.CODEX_SESSION_DIR;
  if (envValue) {
    for (const raw of envValue.split(deps.path.delimiter)) {
      if (!raw.trim()) continue;
      addDir(raw.trim());
    }
  }

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
