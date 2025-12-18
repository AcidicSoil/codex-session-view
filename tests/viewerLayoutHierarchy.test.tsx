import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ViewerPage } from '~/features/viewer/viewer.page'
import { deriveSessionId } from '~/features/viewer/viewer.workspace.utils'
import { createDiscoveredSessionAsset, type DiscoveredSessionAsset } from '~/lib/viewerDiscovery'

let mockSearchState: Record<string, unknown> = {}
const mockNavigate = vi.fn((options?: { search?: Record<string, unknown> | ((prev: Record<string, unknown>) => Record<string, unknown>) }) => {
  if (options?.search) {
    mockSearchState =
      typeof options.search === 'function' ? options.search(mockSearchState) : options.search
  }
})
let mockLoaderSessionId = 'test-session'

vi.mock('@tanstack/react-router', () => ({
  ClientOnly: ({ children }: any) => <>{typeof children === 'function' ? children() : children}</>,
  Link: ({ children, ...props }: any) => (
    <a data-testid={`link-${props.to}`} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="viewer-outlet" />, 
  useLoaderData: () => ({
    projectFiles: [],
    sessionAssets: [],
    generatedAt: Date.now(),
    stats: {},
    inputs: {
      projectGlobPatterns: [],
      projectExcludedGlobs: [],
      bundledSessionGlobs: [],
      externalDirectories: [],
      uploadStores: [],
    },
    sessionId: mockLoaderSessionId,
    sessionCoach: null,
    ruleSheet: [],
    uiSettings: null,
    uiSettingsProfileId: 'test-profile',
  }),
  useRouter: () => ({ navigate: mockNavigate }),
  useRouterState: () => ({ location: { pathname: '/viewer', search: mockSearchState } }),
  useLoaderContext: () => ({}),
}))

vi.mock('~/hooks/useFileLoader', () => ({
  useFileLoader: () => ({
    state: { events: [], phase: 'idle', meta: null },
    progress: { ok: 0, fail: 0, total: 0 },
    setPersist: vi.fn(),
    persist: true,
    start: vi.fn(),
    reset: vi.fn(),
    hydrated: true,
  }),
}))

const mockUiSettingsState = {
  hydrateFromSnapshot: vi.fn(),
  openRuleInspector: vi.fn(),
  closeRuleInspector: vi.fn(),
  setRuleInspectorTab: vi.fn(),
  selectInspectorRule: vi.fn(),
  selectInspectorEvent: vi.fn(),
  updateTimelinePreferences: vi.fn(),
  setTimelineRange: vi.fn(),
  setCommandFilter: vi.fn(),
  lastSessionPath: null,
  setLastSessionPath: vi.fn(),
  ruleInspector: {
    open: false,
    activeTab: 'gate',
    ruleId: undefined,
    eventIndex: null,
  },
  timelinePreferences: {
    filters: [],
    quickFilter: 'all',
    roleFilter: 'all',
    sortOrder: 'desc',
    searchQuery: '',
    eventRange: null,
    commandFilter: { families: [], query: '' },
  },
}

vi.mock('~/stores/uiSettingsStore', () => ({
  useUiSettingsStore: (selector: (state: typeof mockUiSettingsState) => any) => selector(mockUiSettingsState),
}))

const discoveryState = {
  sessionAssets: [] as DiscoveredSessionAsset[],
  appendSessionAssets: vi.fn(),
  onSessionOpen: vi.fn(),
  stopLiveWatcher: vi.fn(),
  loadingSessionPath: null as string | null,
  selectedSessionPath: null as string | null,
}
const setSelectedSessionPathSpy = vi.fn((path: string | null) => {
  discoveryState.selectedSessionPath = path
})

vi.mock('~/features/viewer/viewer.discovery.section', () => {
  const React = require('react')
  return {
    useViewerDiscovery: () => {
      const [selectedSessionPath, setSelectedSessionPathState] = React.useState<string | null>(
        discoveryState.selectedSessionPath,
      )
      const setSelectedSessionPath = (path: string | null) => {
        setSelectedSessionPathSpy(path)
        setSelectedSessionPathState(path)
        discoveryState.selectedSessionPath = path
      }
      return {
        snapshot: { generatedAt: Date.now(), sessionAssets: discoveryState.sessionAssets, projectFiles: [], stats: {} },
        projectFiles: [],
        sessionAssets: discoveryState.sessionAssets,
        appendSessionAssets: discoveryState.appendSessionAssets,
        onSessionOpen: discoveryState.onSessionOpen,
        loadingSessionPath: discoveryState.loadingSessionPath,
        selectedSessionPath,
        setSelectedSessionPath,
        stopLiveWatcher: discoveryState.stopLiveWatcher,
      }
    },
    DiscoverySection: () => <div data-testid="discovery-section">Discovery</div>,
  }
})

vi.mock('~/features/viewer/viewer.upload.section', () => ({
  useUploadController: () => ({
    loader: { state: { events: [], phase: 'idle', meta: null }, progress: { ok: 0, fail: 0, total: 0 }, persist: true },
    dropZoneStatus: 'Idle',
    dropZonePending: false,
    hasEvents: false,
    isEjecting: false,
    persistEnabled: true,
    setPersist: vi.fn(),
    ejectSession: vi.fn(),
    handleFile: vi.fn(),
    handleFolderSelection: vi.fn(),
    meta: null,
  }),
  UploadControlsCard: () => <div data-testid="upload-controls" />, 
  UploadTimelineSection: () => <div data-testid="timeline-section" />,
}))

vi.mock('~/server/function/chatbotState', () => ({
  fetchChatbotState: vi.fn(async () => null),
}))

vi.mock('~/server/function/sessionRepoContext', () => ({
  sessionRepoContext: vi.fn(async () => undefined),
}))

vi.mock('~/server/function/ruleInventory', () => ({
  fetchRuleInventory: vi.fn(async () => []),
}))

vi.mock('~/server/function/hookifyAddToChat', () => ({
  hookifyAddToChat: vi.fn(async () => ({ blocked: false, severity: 'info', rules: [], decisionId: 'test', prefill: { prompt: 'hi', metadata: {} } })),
}))

describe('Viewer layout', () => {
  beforeEach(() => {
    mockSearchState = {}
    mockLoaderSessionId = 'test-session'
    mockNavigate.mockClear()
    discoveryState.sessionAssets = []
    discoveryState.selectedSessionPath = null
    setSelectedSessionPathSpy.mockClear()
  })

  it('renders navigation and outlet shell', () => {
    render(<ViewerPage />)

    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByTestId('viewer-outlet')).toBeInTheDocument()
  })

  it('syncs route-selected session to explorer without redundant updates', () => {
    const assetPath = 'sessions/demo/session-a.jsonl'
    const sessionId = deriveSessionId(assetPath)
    mockLoaderSessionId = sessionId
    discoveryState.sessionAssets = [
      createDiscoveredSessionAsset({
        path: assetPath,
        url: '/sessions/demo/session-a.jsonl',
        source: 'bundled',
        repoLabel: 'demo',
      }),
    ]
    const { rerender } = render(<ViewerPage />)
    expect(setSelectedSessionPathSpy).toHaveBeenCalledTimes(1)
    expect(setSelectedSessionPathSpy).toHaveBeenCalledWith(assetPath)
    setSelectedSessionPathSpy.mockClear()
    rerender(<ViewerPage />)
    expect(setSelectedSessionPathSpy).not.toHaveBeenCalled()
  })
})
