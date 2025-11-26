import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RouterProvider, createRoute, createRouter, createRootRouteWithContext } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { Outlet } from '@tanstack/react-router'
import { ViewerClient } from '~/features/viewer/viewer.page'
import { VIEWER_ROUTE_ID } from '~/features/viewer/route-id'

vi.mock('~/features/viewer/route-id', () => ({
  VIEWER_ROUTE_ID: '/' as const,
  VIEWER_ROUTE_PATH: '/viewer' as const,
}))

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
  it('renders navbar, ingest dropzone, timeline, and chat dock in order', async () => {
    const queryClient = new QueryClient()
    const rootRoute = createRootRouteWithContext<{ queryClient: QueryClient }>()({
      component: () => <Outlet />,
    })
    const viewerRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      loader: () => ({
        projectFiles: [],
        sessionAssets: [],
        generatedAt: Date.now(),
        stats: { bundled: 0, external: 0, uploads: 0, total: 0 },
        inputs: {
          projectGlobPatterns: [],
          projectExcludedGlobs: [],
          bundledSessionGlobs: [],
          externalDirectories: [],
          uploadStores: [],
        },
        sessionId: 'test-session',
        sessionCoach: null,
      }),
      component: ViewerClient,
    })
    const routeTree = rootRoute.addChildren([viewerRoute])
    const router = createRouter({
      routeTree,
      context: { queryClient },
    })

    render(<RouterProvider router={router as any} />)
    const nav = await screen.findByTestId('viewer-floating-navbar')
    const dropzone = await screen.findByTestId('session-upload-dropzone')
    const timelineSection = await screen.findByTestId('timeline-section')
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
    expect(await screen.findByTestId('timeline-tracing-beam')).toBeInTheDocument()
  })
})
