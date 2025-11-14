export interface DiscoveredSessionAsset {
  path: string;
  url: string;
  sortKey?: number;
  tags?: readonly string[];
}
export interface ProjectDiscoverySnapshot {
  projectFiles: string[];
  sessionAssets: DiscoveredSessionAsset[];
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
/**
 * Build-time discovery of project files and session assets.
 * Runs inside route loaders (rule: fetch on navigation vs. useEffect).
 */
export function discoverProjectAssets(): ProjectDiscoverySnapshot {
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
  const sessionAssets: DiscoveredSessionAsset[] = Object.entries(sessionMatches)
    .map(([path, url]) => ({
      path: path.replace(/^\//, ''),
      url,
      sortKey: extractSortKeyFromPath(path),
    }))
    .sort((a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0) || a.path.localeCompare(b.path));
  return { projectFiles, sessionAssets };
}
