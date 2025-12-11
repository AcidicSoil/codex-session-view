import { create } from 'zustand'
import {
  type BookmarkRecord,
  type BookmarkType,
  type RuleInspectorState,
  type RuleInspectorTab,
  type SessionExplorerPersistState,
  type TimelinePreferencesState,
  type UiSettingsSnapshot,
  DEFAULT_RULE_INSPECTOR_STATE,
  DEFAULT_SESSION_EXPLORER_STATE,
  DEFAULT_TIMELINE_PREFERENCES,
  DEFAULT_UI_SETTINGS_SNAPSHOT,
  cloneUiSettingsSnapshot,
  type TimelineRangeState,
  type TimelineCommandFilterState,
} from '~/lib/ui-settings'
import { generateId } from '~/utils/id-generator'
import { persistUiSettings } from '~/server/function/uiSettingsState'

const LOCAL_STORAGE_KEY = 'codex-viewer:ui-settings'

type SnapshotSource = 'server' | 'guest' | 'default'

export interface UiSettingsState extends UiSettingsSnapshot {
  profileId: string | null
  hydrateFromSnapshot: (
    snapshot: UiSettingsSnapshot | null,
    profileId: string | null,
    source?: SnapshotSource,
  ) => void
  setLastSessionPath: (path: string | null | undefined) => void
  openRuleInspector: (input?: Partial<RuleInspectorState>) => void
  closeRuleInspector: () => void
  setRuleInspectorTab: (tab: RuleInspectorTab) => void
  selectInspectorRule: (ruleId?: string) => void
  selectInspectorEvent: (eventIndex: number | null) => void
  toggleBookmark: (bookmark: Omit<BookmarkRecord, 'id' | 'createdAt'>) => void
  isBookmarked: (type: BookmarkType, entityId: string) => boolean
  updateSessionExplorer: (updater: (prev: SessionExplorerPersistState) => SessionExplorerPersistState) => void
  updateTimelinePreferences: (updater: (prev: TimelinePreferencesState) => TimelinePreferencesState) => void
  setTimelineRange: (range: TimelineRangeState | null) => void
  setCommandFilter: (updater: (prev: TimelineCommandFilterState) => TimelineCommandFilterState) => void
  resetSessionExplorer: () => void
  resetTimelinePreferences: () => void
  reset: () => void
}

function loadGuestSnapshot(): UiSettingsSnapshot | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UiSettingsSnapshot
    return cloneUiSettingsSnapshot(parsed)
  } catch {
    return null
  }
}

function persistGuestSnapshot(snapshot: UiSettingsSnapshot) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore storage quota errors
  }
}

function snapshotFromState(state: UiSettingsState): UiSettingsSnapshot {
  return {
    lastSessionPath: state.lastSessionPath ?? null,
    ruleInspector: { ...state.ruleInspector },
    bookmarks: [...state.bookmarks],
    sessionExplorer: {
      sessionPreset: state.sessionExplorer.sessionPreset,
      filters: {
        ...state.sessionExplorer.filters,
        sourceFilters: [...state.sessionExplorer.filters.sourceFilters],
        branchFilters: [...state.sessionExplorer.filters.branchFilters],
        tagFilters: [...state.sessionExplorer.filters.tagFilters],
      },
    },
    timelinePreferences: { ...state.timelinePreferences },
  }
}

function persistSnapshot(state: UiSettingsState) {
  const snapshot = snapshotFromState(state)
  if (state.profileId) {
    void persistUiSettings({ data: { profileId: state.profileId, settings: snapshot } })
  } else {
    persistGuestSnapshot(snapshot)
  }
}

export const useUiSettingsStore = create<UiSettingsState>()((set, get) => ({
  profileId: null,
  ...cloneUiSettingsSnapshot(DEFAULT_UI_SETTINGS_SNAPSHOT),
  hydrateFromSnapshot: (snapshot, profileId, source = 'default') => {
    const baseSnapshot =
      source === 'guest' && !snapshot ? loadGuestSnapshot() : snapshot ?? loadGuestSnapshot()
    const next = cloneUiSettingsSnapshot(baseSnapshot)
    set({ ...next, profileId: profileId ?? null })
  },
  setLastSessionPath: (path) => {
    set({ lastSessionPath: path ?? null })
    persistSnapshot(get())
  },
  openRuleInspector: (input) => {
    set(({ ruleInspector }) => ({
      ruleInspector: {
        ...ruleInspector,
        ...input,
        open: true,
        activeTab: input?.activeTab ?? ruleInspector.activeTab,
      },
    }))
    persistSnapshot(get())
  },
  closeRuleInspector: () => {
    set(({ ruleInspector }) => ({ ruleInspector: { ...ruleInspector, open: false } }))
    persistSnapshot(get())
  },
  setRuleInspectorTab: (tab) => {
    set(({ ruleInspector }) => ({ ruleInspector: { ...ruleInspector, activeTab: tab } }))
    persistSnapshot(get())
  },
  selectInspectorRule: (ruleId) => {
    set(({ ruleInspector }) => ({ ruleInspector: { ...ruleInspector, ruleId: ruleId ?? undefined } }))
    persistSnapshot(get())
  },
  selectInspectorEvent: (eventIndex) => {
    set(({ ruleInspector }) => ({ ruleInspector: { ...ruleInspector, eventIndex } }))
    persistSnapshot(get())
  },
  toggleBookmark: (bookmark) => {
    set((state) => {
      const existing = state.bookmarks.find(
        (entry) => entry.type === bookmark.type && entry.entityId === bookmark.entityId,
      )
      if (existing) {
        return { bookmarks: state.bookmarks.filter((entry) => entry.id !== existing.id) }
      }
      const next: BookmarkRecord = {
        id: generateId('bookmark'),
        createdAt: Date.now(),
        ...bookmark,
      }
      return { bookmarks: [...state.bookmarks, next] }
    })
    persistSnapshot(get())
  },
  isBookmarked: (type, entityId) =>
    Boolean(get().bookmarks.find((entry) => entry.type === type && entry.entityId === entityId)),
  updateSessionExplorer: (updater) => {
    set((state) => ({ sessionExplorer: updater(state.sessionExplorer) }))
    persistSnapshot(get())
  },
  updateTimelinePreferences: (updater) => {
    set((state) => ({ timelinePreferences: updater(state.timelinePreferences) }))
    persistSnapshot(get())
  },
  setTimelineRange: (range) => {
    set((state) => ({ timelinePreferences: { ...state.timelinePreferences, eventRange: range } }))
    persistSnapshot(get())
  },
  setCommandFilter: (updater) => {
    set((state) => ({ timelinePreferences: { ...state.timelinePreferences, commandFilter: updater(state.timelinePreferences.commandFilter) } }))
    persistSnapshot(get())
  },
  resetSessionExplorer: () => {
    set({
      sessionExplorer: {
        ...DEFAULT_SESSION_EXPLORER_STATE,
        filters: cloneUiSettingsSnapshot(DEFAULT_UI_SETTINGS_SNAPSHOT).sessionExplorer.filters,
      },
    })
    persistSnapshot(get())
  },
  resetTimelinePreferences: () => {
    set({ timelinePreferences: { ...DEFAULT_TIMELINE_PREFERENCES } })
    persistSnapshot(get())
  },
  reset: () => {
    set({
      ...cloneUiSettingsSnapshot(DEFAULT_UI_SETTINGS_SNAPSHOT),
      profileId: get().profileId,
    })
    persistSnapshot(get())
  },
}))

export type {
  BookmarkRecord,
  BookmarkType,
  RuleInspectorState,
  RuleInspectorTab,
  SessionExplorerPersistState,
  TimelinePreferencesState,
  UiSettingsSnapshot,
} from '~/lib/ui-settings'
