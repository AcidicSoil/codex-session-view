import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ViewerPage } from '~/features/viewer/viewer.page'
import { deriveSessionId, resolveSelectedSessionPath } from '~/features/viewer/viewer.workspace.utils'

vi.mock('~/features/viewer/viewer.workspace', () => ({
  ViewerWorkspaceBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="viewer-boundary">{children}</div>
  ),
}))

vi.mock('~/features/viewer/viewer.workspace.chrome', () => ({
  ViewerWorkspaceChrome: () => (
    <div data-testid="viewer-shell">
      <nav>
        <button type="button">Explorer</button>
        <button type="button">Inspector</button>
        <button type="button">Chat</button>
      </nav>
      <div data-testid="viewer-outlet">Outlet</div>
    </div>
  ),
  ViewerSkeleton: () => <div data-testid="viewer-skeleton" />,
}))

describe('Viewer layout', () => {
  it('renders navigation and outlet shell', () => {
    render(<ViewerPage />)
    expect(screen.getByTestId('viewer-boundary')).toBeInTheDocument()
    expect(screen.getByText('Explorer')).toBeInTheDocument()
    expect(screen.getByText('Inspector')).toBeInTheDocument()
    expect(screen.getByText('Chat')).toBeInTheDocument()
    expect(screen.getByTestId('viewer-outlet')).toHaveTextContent('Outlet')
  })
})

describe('resolveSelectedSessionPath', () => {
  const makeMap = (entries: Record<string, string>) => {
    const map = new Map<string, string>()
    for (const [sessionId, path] of Object.entries(entries)) {
      map.set(sessionId, path)
    }
    return map
  }

  it('returns undefined when selection already matches active session', () => {
    const path = '/sessions/demo/session-a.jsonl'
    const sessionId = deriveSessionId(path)
    const decision = resolveSelectedSessionPath({
      activeSessionId: sessionId,
      selectedSessionPath: path,
      sessionIdToAssetPath: makeMap({ [sessionId]: path }),
    })
    expect(decision).toBeUndefined()
  })

  it('requests selection update when active session maps to a different asset', () => {
    const currentPath = '/sessions/demo/session-a.jsonl'
    const nextPath = '/sessions/demo/session-b.jsonl'
    const decision = resolveSelectedSessionPath({
      activeSessionId: 'session-b',
      selectedSessionPath: currentPath,
      sessionIdToAssetPath: makeMap({ 'session-b': nextPath }),
    })
    expect(decision).toBe(nextPath)
  })

  it('clears selection when no asset matches the active session', () => {
    const decision = resolveSelectedSessionPath({
      activeSessionId: 'session-c',
      selectedSessionPath: '/sessions/demo/session-a.jsonl',
      sessionIdToAssetPath: makeMap({}),
    })
    expect(decision).toBeNull()
  })
})
