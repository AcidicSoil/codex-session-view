import type { Filter } from '~/components/ui/filters'
import type {
  SessionExplorerFilterState,
} from '~/components/viewer/session-list/sessionExplorerTypes'
import { defaultFilterState } from '~/components/viewer/session-list/sessionExplorerTypes'
import type {
  QuickFilter,
  RoleQuickFilter,
  SortOrder,
  TimelineFilterValue,
} from '~/components/viewer/TimelineFilters'

export interface TimelineRangeState {
  startIndex?: number | null
  endIndex?: number | null
}

export interface TimelineCommandFilterState {
  families: string[]
  query: string
}

export type BookmarkType = 'session' | 'event' | 'chat' | 'rule'

export interface BookmarkRecord {
  id: string
  type: BookmarkType
  entityId: string
  label?: string
  meta?: Record<string, string | number | boolean>
  createdAt: number
}

export type RuleInspectorTab = 'gate' | 'rules' | 'events' | 'inventory'

export interface RuleInspectorState {
  open: boolean
  activeTab: RuleInspectorTab
  sessionId?: string
  assetPath?: string | null
  ruleId?: string
  eventIndex?: number | null
}

export interface SessionExplorerPersistState {
  filters: SessionExplorerFilterState
}

export interface TimelinePreferencesState {
  filters: Filter<TimelineFilterValue>[]
  quickFilter: QuickFilter
  roleFilter: RoleQuickFilter
  sortOrder: SortOrder
  searchQuery: string
  eventRange: TimelineRangeState | null
  commandFilter: TimelineCommandFilterState
}

export interface UiSettingsSnapshot {
  lastSessionPath: string | null
  ruleInspector: RuleInspectorState
  bookmarks: BookmarkRecord[]
  sessionExplorer: SessionExplorerPersistState
  timelinePreferences: TimelinePreferencesState
}

function cloneSessionExplorerFilters(source: SessionExplorerFilterState): SessionExplorerFilterState {
  return {
    ...source,
  }
}

export const DEFAULT_RULE_INSPECTOR_STATE: RuleInspectorState = {
  open: false,
  activeTab: 'gate',
  sessionId: undefined,
  assetPath: undefined,
  ruleId: undefined,
  eventIndex: undefined,
}

export const DEFAULT_SESSION_EXPLORER_STATE: SessionExplorerPersistState = {
  filters: cloneSessionExplorerFilters(defaultFilterState),
}

export const DEFAULT_TIMELINE_PREFERENCES: TimelinePreferencesState = {
  filters: [],
  quickFilter: 'all',
  roleFilter: 'all',
  sortOrder: 'desc',
  searchQuery: '',
  eventRange: null,
  commandFilter: { families: [], query: '' },
}

export const DEFAULT_UI_SETTINGS_SNAPSHOT: UiSettingsSnapshot = {
  lastSessionPath: null,
  ruleInspector: DEFAULT_RULE_INSPECTOR_STATE,
  bookmarks: [],
  sessionExplorer: {
    ...DEFAULT_SESSION_EXPLORER_STATE,
    filters: cloneSessionExplorerFilters(DEFAULT_SESSION_EXPLORER_STATE.filters),
  },
  timelinePreferences: DEFAULT_TIMELINE_PREFERENCES,
}

export function cloneUiSettingsSnapshot(source?: UiSettingsSnapshot | null): UiSettingsSnapshot {
  if (!source) {
    return {
      ...DEFAULT_UI_SETTINGS_SNAPSHOT,
      sessionExplorer: {
        ...DEFAULT_SESSION_EXPLORER_STATE,
        filters: cloneSessionExplorerFilters(DEFAULT_SESSION_EXPLORER_STATE.filters),
      },
    }
  }
  return {
    lastSessionPath: source.lastSessionPath ?? null,
    ruleInspector: { ...DEFAULT_RULE_INSPECTOR_STATE, ...source.ruleInspector },
    bookmarks: Array.isArray(source.bookmarks) ? [...source.bookmarks] : [],
    sessionExplorer: {
      filters: cloneSessionExplorerFilters(
        source.sessionExplorer?.filters ?? DEFAULT_SESSION_EXPLORER_STATE.filters,
      ),
    },
    timelinePreferences: {
      filters: source.timelinePreferences?.filters ?? [],
      quickFilter: source.timelinePreferences?.quickFilter ?? DEFAULT_TIMELINE_PREFERENCES.quickFilter,
      roleFilter: source.timelinePreferences?.roleFilter ?? DEFAULT_TIMELINE_PREFERENCES.roleFilter,
      sortOrder: source.timelinePreferences?.sortOrder ?? DEFAULT_TIMELINE_PREFERENCES.sortOrder,
      searchQuery: source.timelinePreferences?.searchQuery ?? DEFAULT_TIMELINE_PREFERENCES.searchQuery,
      eventRange: source.timelinePreferences?.eventRange ?? null,
      commandFilter: source.timelinePreferences?.commandFilter ?? { families: [], query: '' },
    },
  }
}
