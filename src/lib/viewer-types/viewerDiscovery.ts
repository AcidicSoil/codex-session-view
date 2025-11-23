import type { RepoMetadata } from '~/lib/repo-metadata';

export type SessionAssetSource = 'bundled' | 'external' | 'upload';

export interface DiscoveredSessionAsset {
  path: string;
  url: string;
  sortKey?: number;
  size?: number;
  tags?: readonly string[];
  repoLabel?: string;
  repoMeta?: RepoMetadata;
  source: SessionAssetSource;
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
  repoLabel?: string;
  repoMeta?: RepoMetadata;
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
  return {
    path: `uploads/${record.originalName}`,
    url: record.url,
    sortKey: Date.parse(record.storedAt),
    size: record.size,
    tags: ['upload'],
    repoLabel: record.repoLabel,
    repoMeta: record.repoMeta,
    source: 'upload',
  };
}
