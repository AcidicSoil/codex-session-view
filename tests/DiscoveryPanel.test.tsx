import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import type { DiscoveredSessionAsset } from "~/lib/viewerDiscovery"
import { DiscoveryPanel } from "~/components/viewer/DiscoveryPanel"

const sampleSessions: DiscoveredSessionAsset[] = [
    { path: "sessions/alpha.jsonl", url: "/sessions/alpha.jsonl", sortKey: Date.UTC(2024, 0, 2) },
    { path: "sessions/beta.jsonl", url: "/sessions/beta.jsonl", sortKey: Date.UTC(2024, 0, 3) }
]

describe("DiscoveryPanel", () => {
    it("renders counts and session rows", () => {
        render(<DiscoveryPanel projectFiles={["src/App.tsx", "README.md"]} sessionAssets={sampleSessions} />)

        expect(screen.getByText(/project files/i)).toHaveTextContent("2 project files")
        expect(screen.getByText(/session assets/i)).toHaveTextContent("2 session assets")
        expect(screen.getByText("sessions/alpha.jsonl")).toBeInTheDocument()
        expect(screen.getByText("sessions/beta.jsonl")).toBeInTheDocument()
    })

    it("shows empty state when no results match", () => {
        render(<DiscoveryPanel projectFiles={[]} sessionAssets={[]} />)

        expect(screen.getByText("No session logs discovered yet.")).toBeInTheDocument()
    })
})
