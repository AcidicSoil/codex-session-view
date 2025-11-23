import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { SessionList } from "~/components/viewer/SessionList"
import type { DiscoveredSessionAsset } from "~/lib/viewerDiscovery"

const sampleSessions: DiscoveredSessionAsset[] = [
  {
    path: "sessions/alpha/run-a.jsonl",
    url: "/sessions/alpha/run-a.jsonl",
    sortKey: Date.UTC(2024, 0, 20),
    size: 2_400_000,
    tags: ["alpha"],
    repoLabel: "Alpha",
    repoMeta: { repo: "example/alpha", branch: "main", commit: "abc123" },
    source: "bundled",
  },
  {
    path: "sessions/beta/run-a.jsonl",
    url: "/sessions/beta/run-a.jsonl",
    sortKey: Date.UTC(2024, 0, 10),
    size: 80_000,
    repoLabel: "Beta",
    repoMeta: { repo: "example/beta", branch: "develop" },
    source: "bundled",
  },
  {
    path: "sessions/beta/run-b.jsonl",
    url: "/sessions/beta/run-b.jsonl",
    sortKey: Date.UTC(2023, 11, 10),
    size: 70_000,
    tags: ["upload"],
    repoLabel: "Beta",
    repoMeta: { repo: "example/beta", branch: "develop" },
    source: "upload",
  },
]

describe("SessionList", () => {
  it("filters repositories with search input", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    expect(screen.getByText(/example\/alpha/i)).toBeInTheDocument()
    expect(screen.getByText(/example\/beta/i)).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText(/search repo/i), "beta")

    expect(screen.queryByText(/example\/alpha/i)).not.toBeInTheDocument()
    expect(screen.getByText(/example\/beta/i)).toBeInTheDocument()
  })

  it("applies size presets and highlights repo headers", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    await user.click(screen.getByRole("button", { name: /Size: any/i }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: /> 1 MB/i }))

    expect(screen.getByText(/Alpha/i)).toBeInTheDocument()
    expect(screen.queryByText(/Beta/i)).not.toBeInTheDocument()
  })

  it("expands repositories and shows sessions", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    await user.click(screen.getByRole("button", { name: /Toggle example\/alpha • main repository/i }))
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
    await user.click(screen.getByRole("button", { name: /Toggle example\/alpha • main repository/i }))
    const loadButton = await screen.findByRole('button', { name: /Load session/i })
    await user.click(loadButton)
    expect(handleOpen).toHaveBeenCalled()
  })

  it("renders empty state when dataset is empty", () => {
    render(<SessionList sessionAssets={[]} snapshotTimestamp={Date.now()} />)
    expect(screen.getByText(/No session logs discovered yet/i)).toBeInTheDocument()
  })
})
