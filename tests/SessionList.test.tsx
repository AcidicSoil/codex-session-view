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
  },
  {
    path: "sessions/beta/run-a.jsonl",
    url: "/sessions/beta/run-a.jsonl",
    sortKey: Date.UTC(2024, 0, 10),
    size: 80_000,
  },
  {
    path: "sessions/beta/run-b.jsonl",
    url: "/sessions/beta/run-b.jsonl",
    sortKey: Date.UTC(2023, 11, 10),
    size: 70_000,
    tags: ["upload"],
  },
]

describe("SessionList", () => {
  it("filters repositories when size chips are toggled", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    expect(screen.getByText(/Alpha/i)).toBeInTheDocument()
    expect(screen.getByText(/Beta/i)).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Size > 1 MB/i }))

    expect(screen.getByText(/Alpha/i)).toBeInTheDocument()
    expect(screen.queryByText(/Beta/i)).not.toBeInTheDocument()
  })

  it("notifies parent when filters are controlled", async () => {
    const user = userEvent.setup()
    const handleFilters = vi.fn()
    render(
      <SessionList
        sessionAssets={sampleSessions}
        snapshotTimestamp={Date.now()}
        selectedFilterIds={["size-100kb"]}
        onSelectedFilterIdsChange={handleFilters}
      />
    )

    await user.click(screen.getByRole("button", { name: /Size > 1 MB/i }))

    expect(handleFilters).toHaveBeenCalledWith(["size-100kb", "size-1mb"])
  })

  it("notifies parent when repository expansion changes", async () => {
    const user = userEvent.setup()
    const handleExpand = vi.fn()
    render(
      <SessionList
        sessionAssets={sampleSessions}
        snapshotTimestamp={Date.now()}
        expandedRepoIds={[]}
        onExpandedRepoIdsChange={handleExpand}
      />
    )

    await user.click(screen.getByRole("button", { name: /Toggle Beta repository/i }))

    expect(handleExpand).toHaveBeenCalledWith(["beta"])
  })

  it("renders session metadata inside expanded panels", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} snapshotTimestamp={Date.now()} />)

    await user.click(screen.getByRole("button", { name: /Toggle Alpha repository/i }))
    const matches = await screen.findAllByText(/run-a\.jsonl/i)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('link', { name: /Open file/i })).toHaveAttribute('href', '/sessions/alpha/run-a.jsonl')
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
    await user.click(screen.getByRole("button", { name: /Toggle Alpha repository/i }))
    const loadButton = await screen.findByRole('button', { name: /Load session/i })
    await user.click(loadButton)
    expect(handleOpen).toHaveBeenCalled()
  })
})
