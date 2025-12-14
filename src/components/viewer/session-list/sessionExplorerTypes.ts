import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import type { RepoMetadata } from '~/lib/repo-metadata';

export interface BranchGroup {
  id: string;
  name: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
}

export interface RepositoryGroup {
  id: string;
  label: string;
  repoName: string;
  sessions: DiscoveredSessionAsset[];
  totalSize: number;
  lastUpdated?: number;
  repoMeta?: RepoMetadata;
  branches: BranchGroup[];
  branchCount: number;
  hasUnknownBranch: boolean;
}

export type SizeUnit = 'KB' | 'MB';
export type SortKey = 'timestamp' | 'size';
export type SortDirection = 'asc' | 'desc';
export type SessionRecencyPreset = 'all' | '24h' | '7d' | '30d';

export interface SessionExplorerFilterState {
  searchText: string;
  sortKey: SortKey;
  sortDir: SortDirection;
  sizeMinValue: string;
  sizeMinUnit: SizeUnit;
  sizeMaxValue: string;
  sizeMaxUnit: SizeUnit;
  timestampFrom: string;
  timestampTo: string;
  recency: SessionRecencyPreset;
}

export const defaultFilterState: SessionExplorerFilterState = {
  searchText: '',
  sortKey: 'timestamp',
  sortDir: 'desc',
  sizeMinValue: '',
  sizeMinUnit: 'MB',
  sizeMaxValue: '',
  sizeMaxUnit: 'MB',
  timestampFrom: '',
  timestampTo: '',
  recency: 'all',
};

export type FilterBadgeKey = 'size' | 'timestamp';
export const SIZE_UNITS: SizeUnit[] = ['KB', 'MB'];

export interface ActiveFilterBadge {
  key: FilterBadgeKey;
  label: string;
  description: string;
}

export interface QuickFilterOption {
  key: string;
  label: string;
  description: string;
  apply: () => void;
}
