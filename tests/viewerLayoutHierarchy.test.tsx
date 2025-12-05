import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ViewerPage } from '~/features/viewer/viewer.page'

const mockNavigate = vi.fn()

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
    sessionId: 'test-session',
    sessionCoach: null,
    ruleSheet: [],
    uiSettings: null,
    uiSettingsProfileId: 'test-profile',
  }),
  useRouter: () => ({ navigate: mockNavigate }),
  useRouterState: () => ({ location: { pathname: '/viewer' } }),
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
  lastSessionPath: null,
  setLastSessionPath: vi.fn(),
  ruleInspector: {
    open: false,
    activeTab: 'gate',
    ruleId: undefined,
    eventIndex: null,
  },
}

vi.mock('~/stores/uiSettingsStore', () => ({
  useUiSettingsStore: (selector: (state: typeof mockUiSettingsState) => any) => selector(mockUiSettingsState),
}))

vi.mock('~/features/viewer/viewer.discovery.section', () => ({
  useViewerDiscovery: () => ({
    snapshot: { generatedAt: Date.now(), sessionAssets: [], projectFiles: [], stats: {} },
    projectFiles: [],
    sessionAssets: [],
    appendSessionAssets: vi.fn(),
    onSessionOpen: vi.fn(),
    loadingSessionPath: null,
    selectedSessionPath: null,
    setSelectedSessionPath: vi.fn(),
  }),
  DiscoverySection: () => <div data-testid="discovery-section">Discovery</div>,
}))

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
  it('renders navigation and outlet shell', () => {
    render(<ViewerPage />)

    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByTestId('viewer-outlet')).toBeInTheDocument()
  })
})
