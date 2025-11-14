import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DiscoveredSessionAsset } from "~/lib/viewerDiscovery"
import { DiscoveryPanel } from "./DiscoveryPanel"

const sampleSessions: DiscoveredSessionAsset[] = [
    { path: "sessions/alpha.jsonl", url: "/sessions/alpha.jsonl", sortKey: Date.UTC(2024, 0, 2) },
    { path: "sessions/beta.jsonl", url: "/sessions/beta.jsonl", sortKey: Date.UTC(2024, 0, 3) }
]

describe("DiscoveryPanel", () => {
    it("renders counts and session rows", () => {
        render(
            <DiscoveryPanel projectFiles={["src/App.tsx", "README.md"]} sessionAssets={sampleSessions} query="" onQueryChange={() => {}} />
        )

        expect(screen.getByText(/project files/i)).toHaveTextContent("2 project files")
        expect(screen.getByText(/session assets/i)).toHaveTextContent("2 session assets")
        expect(screen.getByText("sessions/alpha.jsonl")).toBeInTheDocument()
        expect(screen.getByText("sessions/beta.jsonl")).toBeInTheDocument()
    })

    it("invokes search handler when typing", () => {
        const onQueryChange = vi.fn()
        render(<DiscoveryPanel projectFiles={[]} sessionAssets={sampleSessions} query="" onQueryChange={onQueryChange} />)

        const input = screen.getByPlaceholderText("Filter by file name…")
        fireEvent.change(input, { target: { value: "beta" } })

        expect(onQueryChange).toHaveBeenCalledWith("beta")
    })

    it("shows empty state when no results match", () => {
        render(
            <DiscoveryPanel
                projectFiles={[]}
                sessionAssets={sampleSessions}
                query="zzz"
                onQueryChange={() => {}}
            />
        )

        expect(screen.getByText("No session logs match that filter.")).toBeInTheDocument()
    })
})
