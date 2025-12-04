import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Filter } from '~/components/ui/filters'
import type {
  SessionExplorerFilterState,
  SessionPreset,
} from '~/components/viewer/session-list/sessionExplorerTypes'
import { defaultFilterState } from '~/components/viewer/session-list/sessionExplorerTypes'
import type {
  QuickFilter,
  RoleQuickFilter,
  SortOrder,
  TimelineFilterValue,
} from '~/components/viewer/TimelineFilters'
import { generateId } from '~/utils/id-generator'

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
  sessionPreset: SessionPreset
}

export interface TimelinePreferencesState {
  filters: Filter<TimelineFilterValue>[]
  quickFilter: QuickFilter
  roleFilter: RoleQuickFilter
  sortOrder: SortOrder
  searchQuery: string
}

export interface UiSettingsState {
  lastSessionPath?: string | null
  ruleInspector: RuleInspectorState
  bookmarks: BookmarkRecord[]
  sessionExplorer: SessionExplorerPersistState
  timelinePreferences: TimelinePreferencesState
  setLastSessionPath: (path: string | null | undefined) => void
  openRuleInspector: (input?: Partial<RuleInspectorState>) => void
  closeRuleInspector: () => void
  setRuleInspectorTab: (tab: RuleInspectorTab) => void
  toggleBookmark: (bookmark: Omit<BookmarkRecord, 'id' | 'createdAt'>) => void
  isBookmarked: (type: BookmarkType, entityId: string) => boolean
  updateSessionExplorer: (updater: (prev: SessionExplorerPersistState) => SessionExplorerPersistState) => void
  updateTimelinePreferences: (updater: (prev: TimelinePreferencesState) => TimelinePreferencesState) => void
  resetSessionExplorer: () => void
  resetTimelinePreferences: () => void
  reset: () => void
}

const DEFAULT_RULE_INSPECTOR_STATE: RuleInspectorState = {
  open: false,
  activeTab: 'gate',
  sessionId: undefined,
  assetPath: undefined,
  ruleId: undefined,
  eventIndex: undefined,
}

function cloneSessionExplorerFilters(source: SessionExplorerFilterState): SessionExplorerFilterState {
  return {
    ...source,
    sourceFilters: [...source.sourceFilters],
    branchFilters: [...source.branchFilters],
    tagFilters: [...source.tagFilters],
  }
}

const DEFAULT_SESSION_EXPLORER_STATE: SessionExplorerPersistState = {
  filters: cloneSessionExplorerFilters(defaultFilterState),
  sessionPreset: 'all',
}

const DEFAULT_TIMELINE_PREFERENCES: TimelinePreferencesState = {
  filters: [],
  quickFilter: 'all',
  roleFilter: 'all',
  sortOrder: 'desc',
  searchQuery: '',
}

const noopStorage: Storage = {
  length: 0,
  clear: () => undefined,
  getItem: () => null,
  key: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
}

export const useUiSettingsStore = create<UiSettingsState>()(
  persist(
    (set, get) => ({
      lastSessionPath: null,
      ruleInspector: DEFAULT_RULE_INSPECTOR_STATE,
      bookmarks: [],
      sessionExplorer: { ...DEFAULT_SESSION_EXPLORER_STATE, filters: cloneSessionExplorerFilters(defaultFilterState) },
      timelinePreferences: DEFAULT_TIMELINE_PREFERENCES,
      setLastSessionPath: (path) => {
        set({ lastSessionPath: path ?? null })
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
      },
      closeRuleInspector: () => {
        set(({ ruleInspector }) => ({
          ruleInspector: { ...ruleInspector, open: false },
        }))
      },
      setRuleInspectorTab: (tab) => {
        set(({ ruleInspector }) => ({
          ruleInspector: { ...ruleInspector, activeTab: tab },
        }))
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
      },
      isBookmarked: (type, entityId) =>
        Boolean(get().bookmarks.find((entry) => entry.type === type && entry.entityId === entityId)),
      updateSessionExplorer: (updater) => {
        set((state) => ({
          sessionExplorer: updater(state.sessionExplorer),
        }))
      },
      updateTimelinePreferences: (updater) => {
        set((state) => ({
          timelinePreferences: updater(state.timelinePreferences),
        }))
      },
      resetSessionExplorer: () => {
        set({ sessionExplorer: { ...DEFAULT_SESSION_EXPLORER_STATE, filters: cloneSessionExplorerFilters(defaultFilterState) } })
      },
      resetTimelinePreferences: () => {
        set({ timelinePreferences: DEFAULT_TIMELINE_PREFERENCES })
      },
      reset: () => {
        set({
          lastSessionPath: null,
          ruleInspector: DEFAULT_RULE_INSPECTOR_STATE,
          bookmarks: [],
          sessionExplorer: { ...DEFAULT_SESSION_EXPLORER_STATE, filters: cloneSessionExplorerFilters(defaultFilterState) },
          timelinePreferences: DEFAULT_TIMELINE_PREFERENCES,
        })
      },
    }),
    {
      name: 'codex-viewer:ui-settings',
      storage: createJSONStorage(() => (typeof window === 'undefined' ? noopStorage : window.localStorage)),
      partialize: (state) => ({
        lastSessionPath: state.lastSessionPath,
        ruleInspector: state.ruleInspector,
        bookmarks: state.bookmarks,
        sessionExplorer: state.sessionExplorer,
        timelinePreferences: state.timelinePreferences,
      }),
    },
  ),
)
