import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import * as React from "react"
import { SessionList } from "~/components/viewer/SessionList"
import { createDiscoveredSessionAsset } from "~/lib/viewerDiscovery"
import type { SessionAssetInput } from "~/lib/viewerDiscovery"
import { useUiSettingsStore } from "~/stores/uiSettingsStore"
import type { AnchorHTMLAttributes, ReactNode } from "react"

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === "undefined") {
  // @ts-expect-error: jsdom test shim
  globalThis.ResizeObserver = ResizeObserverStub
}

const sampleInputs: SessionAssetInput[] = [
  {
    path: "sessions/alpha/run-a.jsonl",
    url: "/api/uploads/sessions/alpha/run-a.jsonl",
    sortKey: Date.UTC(2024, 0, 20),
    size: 2_400_000,
    tags: ["alpha"],
    repoLabel: "Alpha",
    repoMeta: { repo: "example/alpha", branch: "main", commit: "abc123" },
    source: "bundled",
  },
  {
    path: "sessions/beta/run-a.jsonl",
    url: "/api/uploads/sessions/beta/run-a.jsonl",
    sortKey: Date.UTC(2024, 0, 10),
    size: 80_000,
    repoLabel: "Beta",
    repoMeta: { repo: "example/beta", branch: "develop" },
    source: "bundled",
  },
  {
    path: "sessions/beta/run-b.jsonl",
    url: "/api/uploads/sessions/beta/run-b.jsonl",
    sortKey: Date.UTC(2023, 11, 10),
    size: 70_000,
    tags: ["upload"],
    repoLabel: "Beta",
    repoMeta: { repo: "example/beta", branch: "develop" },
    source: "upload",
  },
]

type MockSession = ReturnType<typeof createDiscoveredSessionAsset>

const sampleSessions = sampleInputs.map((entry) => createDiscoveredSessionAsset(entry))

vi.mock("@tanstack/react-router", () => {
  const mockRouter = {
    navigate: vi.fn(),
    invalidate: vi.fn(),
    state: { location: { search: {} } },
  }
  const mockLocationState = { location: { search: {} } }
  return {
    useRouter: () => mockRouter,
    useRouterState: () => mockLocationState,
    RouterProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    Link: ({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a {...props}>{children}</a>
    ),
  }
})

vi.mock("~/components/viewer/session-list/SessionRepoVirtualList", () => ({
  SessionRepoVirtualList: ({ sessions, onSessionOpen }: { sessions: MockSession[]; onSessionOpen?: (asset: MockSession) => void }) => (
    <div>
      {sessions.map((session) => (
        <div key={session.path}>
          <p>{session.path}</p>
          <button type="button" onClick={() => onSessionOpen?.(session)}>
            Load session
          </button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock("~/components/viewer/session-list/SessionRepositoryAccordion", () => {
  return {
    SessionRepositoryAccordion: ({
      groups,
      onSessionOpen,
    }: {
      groups: { id: string; label: string; sessions: MockSession[] }[]
      onSessionOpen?: (asset: MockSession) => void
    }) => {
      const [openIds, setOpenIds] = React.useState<string[]>([])
      const toggle = (id: string) =>
        setOpenIds((prev) => (prev.includes(id) ? prev.filter((entry) => entry !== id) : [...prev, id]))
      return (
        <div>
          {groups.map((group) => (
            <div key={group.id}>
              <button type="button" onClick={() => toggle(group.id)}>
                Toggle {group.label} repository
              </button>
              {openIds.includes(group.id) ? (
                <div>
                  {group.sessions.map((session) => (
                    <div key={session.path}>
                      <span>{session.path}</span>
                      <button type="button" onClick={() => onSessionOpen?.(session)}>
                        Load session
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )
    },
  }
})

describe("SessionList", () => {
  beforeEach(() => {
    useUiSettingsStore.getState().resetSessionExplorer()
  })
  it("filters repositories with search input", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    expect(screen.getByRole("button", { name: /Toggle example\/alpha repository/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Toggle example\/beta repository/i })).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText(/search repo/i)
    searchInput.focus()
    await user.type(searchInput, "beta")
    expect(searchInput).toHaveValue("beta")

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Toggle example\/alpha repository/i })).not.toBeInTheDocument()
    })
    expect(screen.getByRole("button", { name: /Toggle example\/beta repository/i })).toBeInTheDocument()
  })

  it("supports regex tokens and renders highlights", async () => {
    const user = userEvent.setup()
    const { container } = render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    const searchInput = screen.getByPlaceholderText(/search repo/i)
    searchInput.focus()
    await user.type(searchInput, "/beta/i")

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Toggle example\/alpha repository/i })).not.toBeInTheDocument()
    })
    expect(container.querySelectorAll("mark").length).toBeGreaterThan(0)
  })

  it("applies advanced size filters via the sheet", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    await user.click(screen.getByRole("button", { name: /Filters/i }))
    const minInput = await screen.findByLabelText(/Minimum/i, { selector: 'input' })
    await user.clear(minInput)
    await user.type(minInput, "1")
    await user.click(screen.getByRole("button", { name: /Done/i }))

    expect(screen.getAllByText(/Alpha/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Beta/i)).not.toBeInTheDocument()
  })

  it("expands repositories and shows sessions", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    await user.click(screen.getByRole("button", { name: /Toggle example\/alpha repository/i }))
    const matches = await screen.findAllByText(/run-a\.jsonl/i)
    expect(matches.length).toBeGreaterThan(0)
  })

  it("calls onSessionOpen when load button pressed", async () => {
    const user = userEvent.setup()
    const handleOpen = vi.fn()
    render(
      <SessionList
        sessionAssets={sampleSessions}
        snapshotTimestamp={Date.now()}
        onSessionOpen={handleOpen}
      />,
    )
    await user.click(screen.getByRole("button", { name: /Toggle example\/alpha repository/i }))
    const loadButton = await screen.findByRole('button', { name: /Load session/i })
    await user.click(loadButton)
    expect(handleOpen).toHaveBeenCalled()
  })

  it("renders empty state when dataset is empty", () => {
    render(<SessionList sessionAssets={[]} snapshotTimestamp={Date.now()} />)
    expect(screen.getByText(/No session logs discovered yet/i)).toBeInTheDocument()
  })
})
