import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadTimelineSection } from '~/features/viewer/viewer.upload.section'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'

vi.mock('~/components/viewer/TimelineWithFilters', () => ({
  TimelineWithFilters: () => <div data-testid="mock-timeline-list">Timeline items</div>,
}))

vi.mock('~/features/viewer/export/useSessionExportController', () => ({
  useSessionExportController: () => ({
    isOpen: false,
    open: vi.fn(),
    close: vi.fn(),
    scope: 'entire',
    setScope: vi.fn(),
    format: 'markdown',
    setFormat: vi.fn(),
    options: { includeTimestamps: false, includeMetadata: false },
    handleToggleOption: vi.fn(),
    scopeResult: { label: 'Entire session', events: [{}], scope: 'entire', isPartial: false },
    filename: 'session-entire.md',
    isDownloadReady: true,
    isPreparing: false,
    download: vi.fn(),
    rangeLabel: undefined,
    totalEvents: 1,
    filteredCount: 1,
    rangeCount: 1,
    selectedEvent: null,
    handleEventSelect: vi.fn(),
  }),
}))

vi.mock('~/features/viewer/export/SessionExportButton', () => ({
  SessionExportButton: () => <button data-testid="export-button">Export</button>,
}))

describe('UploadTimelineSection', () => {
  beforeEach(() => {
    useUiSettingsStore.getState().resetTimelinePreferences()
  })
  it('wraps the timeline list with the tracing beam when events are loaded', () => {
    const controller = {
      loader: {
        state: {
          phase: 'success',
          events: [{ id: 'evt-1' }],
        },
      },
      meta: undefined,
      dropZoneStatus: 'Idle',
      dropZonePending: false,
      hasEvents: true,
      isEjecting: false,
      ejectSession: vi.fn(),
    }
    render(<UploadTimelineSection controller={controller as any} />)
    expect(screen.getByTestId('mock-timeline-list')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-tracing-beam')).toBeInTheDocument()
  })
})
