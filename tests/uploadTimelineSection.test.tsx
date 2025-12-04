import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { UploadTimelineSection } from '~/features/viewer/viewer.upload.section'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'

vi.mock('~/components/viewer/TimelineWithFilters', () => ({
  TimelineWithFilters: () => <div data-testid="mock-timeline-list">Timeline items</div>,
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
    }
    render(<UploadTimelineSection controller={controller as any} />)
    expect(screen.getByTestId('mock-timeline-list')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-tracing-beam')).toBeInTheDocument()
  })
})
