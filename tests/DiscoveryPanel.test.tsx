import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type { DiscoveredSessionAsset } from "~/lib/viewerDiscovery"
import { DiscoveryPanel } from "~/components/viewer/DiscoveryPanel"

const sampleSessions: DiscoveredSessionAsset[] = [
    {
        path: "sessions/alpha.jsonl",
        url: "/sessions/alpha.jsonl",
        sortKey: Date.UTC(2024, 0, 2),
        repoMeta: { repo: "example/alpha", branch: "main" },
        source: "bundled"
    },
    {
        path: "sessions/beta.jsonl",
        url: "/sessions/beta.jsonl",
        sortKey: Date.UTC(2024, 0, 3),
        repoMeta: { repo: "example/beta", branch: "develop" },
        source: "external"
    }
]

describe("DiscoveryPanel", () => {
    it("renders counts, filters, and grouped session lists", () => {
        vi.useFakeTimers()

        try {
            render(
                <DiscoveryPanel
                    projectFiles={["src/App.tsx", "README.md"]}
                    sessionAssets={sampleSessions}
                    generatedAtMs={Date.UTC(2024, 0, 4)}
                    onSessionOpen={vi.fn()}
                    loadingSessionPath={null}
                />,
            )

            expect(screen.getByText(/project files/i)).toHaveTextContent("2 project files")
            expect(screen.getByText(/session assets/i)).toHaveTextContent("2 session assets")
            expect(screen.getByPlaceholderText(/search repo/i)).toBeInTheDocument()
            expect(screen.getByRole("button", { name: /Size: any/i })).toBeInTheDocument()
            expect(screen.getByText(/example\/alpha • main/i)).toBeInTheDocument()

            const expandButton = screen.getByRole("button", { name: /Toggle example\/alpha • main repository/i })

            act(() => {
                fireEvent.click(expandButton)
            })

            act(() => {
                vi.runAllTimers()
            })

            expect(screen.getByText("sessions/alpha.jsonl")).toBeInTheDocument()
        } finally {
            vi.useRealTimers()
        }
    })

    it("shows empty state when no results match", () => {
        render(
            <DiscoveryPanel
                projectFiles={[]}
                sessionAssets={[]}
                generatedAtMs={Date.UTC(2024, 0, 4)}
                onSessionOpen={vi.fn()}
                loadingSessionPath={null}
            />,
        )

        expect(screen.getByText(/No session logs discovered yet/i)).toBeInTheDocument()
    })
})
