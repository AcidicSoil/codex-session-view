import { render, screen, within } from "@testing-library/react"
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
  },
]

describe("SessionList", () => {
  it("filters repositories when size chips are toggled", async () => {
    const user = userEvent.setup()
    render(<SessionList sessionAssets={sampleSessions} />)

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
    render(<SessionList sessionAssets={sampleSessions} expandedRepoIds={[]} onExpandedRepoIdsChange={handleExpand} />)

    const betaCard = screen.getByText(/Beta/i).closest("article") as HTMLElement
    const toggleButton = within(betaCard).getByRole("button", { name: /sessions/i })

    await user.click(toggleButton)

    expect(handleExpand).toHaveBeenCalledWith(["beta"])
  })
})
