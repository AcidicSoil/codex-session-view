import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ResponseItemParsed, SessionMetaParsed } from '~/lib/session-parser'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import type { ExportFormat, ExportOptions, ExportScope, ScopeResolution, SelectedTimelineEvent } from './types'
import { EXPORT_FORMAT_DEFAULTS } from './constants'
import { useTimelineFilterDerivatives, resolveScope } from './scopes'
import { describeFilters, buildFilename } from './summary'
import { buildExportBlob } from './createExportPayload'
import type { TimelineEvent } from '~/components/viewer/AnimatedTimelineList'
import { resolveEventIdentifier } from './utils'

interface UseSessionExportControllerProps {
  events: ResponseItemParsed[]
  sessionMeta?: SessionMetaParsed
}

export function useSessionExportController({ events, sessionMeta }: UseSessionExportControllerProps) {
  const timelinePreferences = useUiSettingsStore((state) => state.timelinePreferences)
  const { filteredEvents, rangeEvents, rangeLabel } = useTimelineFilterDerivatives(events, timelinePreferences)

  const hasFiltersApplied = useMemo(() => {
    return (
      timelinePreferences.filters.length > 0 ||
      timelinePreferences.quickFilter !== 'all' ||
      timelinePreferences.roleFilter !== 'all' ||
      timelinePreferences.searchQuery.trim().length > 0 ||
      timelinePreferences.commandFilter.families.length > 0 ||
      timelinePreferences.commandFilter.query.trim().length > 0
    )
  }, [timelinePreferences])

  const defaultScope: ExportScope = hasFiltersApplied ? 'filtered' : 'entire'
  const [isOpen, setIsOpen] = useState(false)
  const [scope, setScope] = useState<ExportScope>(defaultScope)
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [options, setOptions] = useState<ExportOptions>({ ...EXPORT_FORMAT_DEFAULTS.markdown })
  const [selectedEvent, setSelectedEvent] = useState<SelectedTimelineEvent | null>(null)
  const [isPreparing, setIsPreparing] = useState(false)

  useEffect(() => {
    setOptions({ ...EXPORT_FORMAT_DEFAULTS[format] })
  }, [format])

  useEffect(() => {
    if (!isOpen) {
      setScope(defaultScope)
    }
  }, [isOpen, defaultScope])

  const scopeResult: ScopeResolution = useMemo(
    () =>
      resolveScope({
        scope,
        events,
        filteredEvents,
        rangeEvents,
        rangeLabel,
        selectedEvent,
      }),
    [events, filteredEvents, rangeEvents, rangeLabel, scope, selectedEvent],
  )

  const filterDescription = useMemo(() => describeFilters(timelinePreferences), [timelinePreferences])

  const isDownloadReady = scopeResult.events.length > 0 && (!scopeResult.requiresSelection || Boolean(scopeResult.selectedEvent))
  const filename = useMemo(() => {
    const sessionId = sessionMeta?.id ?? 'session'
    return buildFilename(scopeResult.scope, extensionForFormat(format), sessionId, {
      rangeLabel: scopeResult.rangeLabel,
      selectedEventId: scopeResult.selectedEvent?.resolvedIndex,
      partial: scopeResult.isPartial,
    })
  }, [format, scopeResult, sessionMeta?.id])

  const handleToggleOption = useCallback(
    (key: keyof ExportOptions, value: boolean) => {
      setOptions((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const handleEventSelect = useCallback((event: TimelineEvent, info: { displayIndex: number; absoluteIndex: number }) => {
    setSelectedEvent({
      event: event as ResponseItemParsed,
      resolvedIndex: resolveEventIdentifier(event as ResponseItemParsed, info.displayIndex - 1),
      displayIndex: info.displayIndex,
    })
  }, [])

  const download = useCallback(async () => {
    if (!isDownloadReady) return
    if (typeof window === 'undefined') return
    setIsPreparing(true)
    try {
      const blob = buildExportBlob(format, {
        scopeResult,
        options,
        filterDescription,
        sessionMeta,
        selectedEvent,
        exportedAt: new Date(),
      })
      triggerDownload(filename, blob)
      toast.success('Export ready', { description: filename })
    } catch (error) {
      toast.error('Failed to export', { description: error instanceof Error ? error.message : 'Unknown error' })
    } finally {
      setIsPreparing(false)
    }
  }, [filename, filterDescription, format, isDownloadReady, options, scopeResult, selectedEvent, sessionMeta])

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    scope,
    setScope,
    format,
    setFormat,
    options,
    handleToggleOption,
    scopeResult,
    filterDescription,
    filename,
    isDownloadReady,
    isPreparing,
    download,
    rangeLabel,
    totalEvents: events.length,
    filteredCount: filteredEvents.length,
    rangeCount: rangeEvents.length,
    selectedEvent,
    handleEventSelect,
  }
}

export type SessionExportController = ReturnType<typeof useSessionExportController>

function triggerDownload(filename: string, blob: Blob) {
  const link = document.createElement('a')
  const href = URL.createObjectURL(blob)
  link.href = href
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(href), 1000)
}

function extensionForFormat(format: ExportFormat) {
  switch (format) {
    case 'json':
      return 'json'
    case 'markdown':
      return 'md'
    case 'csv':
      return 'csv'
    case 'text':
      return 'txt'
    default:
      return 'txt'
  }
}
