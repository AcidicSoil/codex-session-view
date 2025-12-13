import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser'
import type { TimelinePreferencesState } from '~/lib/ui-settings'

export type ExportScope = 'entire' | 'filtered' | 'range' | 'event'

export type ExportFormat = 'markdown' | 'json' | 'csv' | 'text'

export interface ExportOptions {
  includeTimestamps: boolean
  includeMetadata: boolean
}

export interface SelectedTimelineEvent {
  event: ResponseItemParsed
  resolvedIndex: number
  displayIndex: number
}

export interface ScopeResolution {
  scope: ExportScope
  events: ResponseItemParsed[]
  isPartial: boolean
  label: string
  rangeLabel?: string
  requiresSelection?: boolean
  selectedEvent?: SelectedTimelineEvent | null
}

export interface ExportContext {
  events: ResponseItemParsed[]
  sessionMeta?: SessionMetaParsed
  timelinePreferences: TimelinePreferencesState
  filteredEvents: ResponseItemParsed[]
  rangeEvents: ResponseItemParsed[]
  rangeLabel?: string
  selectedEvent?: SelectedTimelineEvent | null
}

export interface ExportBuildParams {
  scopeResult: ScopeResolution
  options: ExportOptions
  filterDescription: string | null
  sessionMeta?: SessionMetaParsed
  selectedEvent?: SelectedTimelineEvent | null
  exportedAt?: Date
}
