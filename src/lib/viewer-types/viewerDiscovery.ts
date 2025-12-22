import type { RepoMetadata } from '~/lib/repo-metadata';
import type { SessionOrigin } from '~/lib/session-origin';
import type { SessionStatus } from '~/lib/sessions/model';
import { fallbackRepositoryLabelFromPath } from '~/lib/repository';

export type SessionAssetSource = 'bundled' | 'external' | 'upload';

export interface SessionAssetInput {
  path: string;
  url: string;
  sessionId: string;
  status?: SessionStatus;
  statusLabel?: string;
  startedAt?: string;
  completedAt?: string;
  lastUpdatedAt?: string;
  sortKey?: number;
  size?: number;
  tags?: readonly string[];
  repoLabel?: string;
  repoMeta?: RepoMetadata;
  source: SessionAssetSource;
  lastModifiedIso?: string;
  origin?: SessionOrigin;
}

export interface DiscoveredSessionAsset extends SessionAssetInput {
  repoName: string;
  displayLabel: string;
  branch: string;
  groupYear: number;
}

export interface DiscoveryStats {
  bundled: number;
  external: number;
  uploads: number;
  total: number;
}

export interface SessionDirectoryInfo {
  absolute: string;
  displayPrefix: string;
  origin?: SessionOrigin;
}

export interface DiscoveryInputs {
  projectGlobPatterns: string[];
  projectExcludedGlobs: string[];
  bundledSessionGlobs: string[];
  externalDirectories: SessionDirectoryInfo[];
  uploadStores: string[];
}

export interface ProjectDiscoverySnapshot {
  projectFiles: string[];
  sessionAssets: DiscoveredSessionAsset[];
  generatedAt: number;
  stats: DiscoveryStats;
  inputs: DiscoveryInputs;
}

export interface SessionUploadView {
  originalName: string;
  storedAt: string;
  size: number;
  url: string;
  sessionId: string;
  status?: SessionStatus;
  statusLabel?: string;
  startedAt?: string;
  completedAt?: string;
  lastUpdatedAt?: string;
  repoLabel?: string;
  repoMeta?: RepoMetadata;
  source: SessionAssetSource;
  lastModifiedMs?: number;
  lastModifiedIso?: string;
  origin?: SessionOrigin;
}

export function mergeSessionAssets(...lists: DiscoveredSessionAsset[][]) {
  const map = new Map<string, DiscoveredSessionAsset>();
  for (const list of lists) {
    for (const asset of list) {
      map.set(asset.path, asset);
    }
  }
  return Array.from(map.values());
}

export function sortSessionAssets(assets: DiscoveredSessionAsset[]) {
  return [...assets].sort((a, b) => (b.sortKey ?? 0) - (a.sortKey ?? 0) || a.path.localeCompare(b.path));
}

export function uploadRecordToAsset(record: SessionUploadView): DiscoveredSessionAsset {
  const normalizedSortKey = normalizeSortKey(record.lastModifiedMs, record.storedAt);
  const baseTags = new Set<string>(['upload']);
  if (record.origin) {
    baseTags.add(`origin:${record.origin}`);
  }
  return createDiscoveredSessionAsset({
    path: `uploads/${record.originalName}`,
    url: record.url,
    sessionId: record.sessionId,
    status: record.status,
    statusLabel: record.statusLabel,
    startedAt: record.startedAt,
    completedAt: record.completedAt,
    lastUpdatedAt: record.lastUpdatedAt,
    sortKey: normalizedSortKey,
    size: record.size,
    tags: Array.from(baseTags),
    repoLabel: record.repoLabel,
    repoMeta: record.repoMeta,
    source: record.source,
    lastModifiedIso: record.lastModifiedIso ?? (typeof normalizedSortKey === 'number' ? new Date(normalizedSortKey).toISOString() : undefined),
    origin: record.origin,
  });
}

function normalizeSortKey(lastModifiedMs: number | undefined, storedAt: string) {
  if (typeof lastModifiedMs === 'number' && Number.isFinite(lastModifiedMs)) {
    return lastModifiedMs;
  }
  const parsed = Date.parse(storedAt);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function createDiscoveredSessionAsset(asset: SessionAssetInput): DiscoveredSessionAsset {
  const repoName = deriveRepoName(asset);
  const displayLabel = deriveDisplayLabel(asset.path);
  const branch = deriveBranch(asset);
  const groupYear = deriveGroupYear(asset.sortKey, asset.path);
  return {
    ...asset,
    repoName,
    displayLabel,
    branch,
    groupYear,
  };
}

function deriveRepoName(asset: SessionAssetInput) {
  const candidate = asset.repoMeta?.repo ?? asset.repoLabel ?? fallbackRepositoryLabelFromPath(asset.path) ?? 'unknown-repo';
  return candidate.trim() || 'unknown-repo';
}

function deriveDisplayLabel(path: string) {
  const normalized = path.replace(/\\/g, '/');
  const filename = normalized.split('/').pop() ?? path;
  const withoutExtension = filename.replace(/\.(jsonl|ndjson|json)$/i, '');
  return withoutExtension || filename || path;
}

function deriveBranch(asset: SessionAssetInput) {
  const branch = asset.repoMeta?.branch?.trim();
  return branch && branch.length > 0 ? branch : 'unknown';
}

function deriveGroupYear(sortKey: number | undefined, path: string) {
  if (typeof sortKey === 'number' && Number.isFinite(sortKey) && sortKey > 0) {
    const year = new Date(sortKey).getUTCFullYear();
    if (!Number.isNaN(year)) {
      return year;
    }
  }
  const match = path.match(/(20\d{2}|19\d{2})/);
  if (match) {
    const parsed = Number(match[1]);
    if (parsed >= 1900 && parsed <= 2100) {
      return parsed;
    }
  }
  return new Date().getUTCFullYear();
}
