import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ViewerClient } from '~/features/viewer/viewer.page'

vi.mock('~/hooks/useFileLoader', () => ({
  useFileLoader: () => ({
    state: { events: [], phase: 'idle' },
    progress: { ok: 0, fail: 0, total: 0 },
  }),
}))

vi.mock('~/features/viewer/viewer.discovery.section', () => ({
  DiscoverySection: () => <div data-testid="discovery-section">Discovery</div>,
  useViewerDiscovery: () => ({
    sessionAssets: [],
    appendSessionAssets: vi.fn(),
  }),
}))

vi.mock('~/features/viewer/viewer.upload.section', () => {
  const UploadControlsCard = () => (
    <section data-testid="ingest-card">
      <div data-testid="session-upload-dropzone">Dropzone stub</div>
    </section>
  )
  const UploadTimelineSection = () => (
    <section data-testid="timeline-section">
      <div data-testid="timeline-tracing-beam">Beam stub</div>
      <div data-testid="timeline-list-stub">Timeline stub</div>
    </section>
  )
  const useUploadController = () => ({
    loader: { state: { events: [] } },
  })
  return { UploadControlsCard, UploadTimelineSection, useUploadController }
})

describe('ViewerClient layout', () => {
  it('renders navbar, ingest dropzone, timeline, and chat dock in order', () => {
    render(<ViewerClient />)
    const nav = screen.getByTestId('viewer-floating-navbar')
    const dropzone = screen.getByTestId('session-upload-dropzone')
    const timelineSection = screen.getByTestId('timeline-section')
    const chatDock = document.getElementById('viewer-chat') as HTMLElement

    expect(nav).toBeInTheDocument()
    expect(dropzone).toBeInTheDocument()
    expect(timelineSection).toBeInTheDocument()
    expect(chatDock).toBeInTheDocument()

    expect(
      Boolean(nav.compareDocumentPosition(dropzone) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBeTruthy()
    expect(
      Boolean(timelineSection.compareDocumentPosition(chatDock) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBeTruthy()
    expect(
      Boolean(dropzone.compareDocumentPosition(chatDock) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBeTruthy()
    expect(screen.getByTestId('timeline-tracing-beam')).toBeInTheDocument()
  })
})
