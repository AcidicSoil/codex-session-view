import { act, fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RouterProvider } from "@tanstack/react-router"
import type { DiscoveredSessionAsset } from "~/lib/viewerDiscovery"
import { DiscoveryPanel } from "~/components/viewer/DiscoveryPanel"
import { getRouter } from "~/router"

const sampleSessions: DiscoveredSessionAsset[] = [
    {
        path: "sessions/alpha.jsonl",
        url: "/api/uploads/sessions/alpha.jsonl",
        sortKey: Date.UTC(2024, 0, 2),
        repoMeta: { repo: "example/alpha", branch: "main" },
        repoName: "example/alpha",
        branch: "main",
        source: "bundled"
    },
    {
        path: "sessions/beta.jsonl",
        url: "/api/uploads/sessions/beta.jsonl",
        sortKey: Date.UTC(2024, 0, 3),
        repoMeta: { repo: "example/beta", branch: "develop" },
        repoName: "example/beta",
        branch: "develop",
        source: "external"
    }
]

function renderWithRouter(node: React.ReactElement) {
    const router = getRouter()
    return render(<RouterProvider router={router}>{node}</RouterProvider>)
}

describe("DiscoveryPanel", () => {
    it("renders counts, filters, and grouped session lists", () => {
        vi.useFakeTimers()

        try {
            renderWithRouter(
                <DiscoveryPanel
                    projectFiles={["src/App.tsx", "README.md"]}
                    sessionAssets={sampleSessions}
                    generatedAtMs={Date.UTC(2024, 0, 4)}
                    onSessionOpen={vi.fn()}
                    loadingSessionPath={null}
                />,
            )

            expect(screen.getByText(/Session explorer/i)).toBeInTheDocument()
            expect(screen.getByText(/2 \/ 2 sessions/i)).toBeInTheDocument()
            expect(screen.getByPlaceholderText(/search repo, branch/i)).toBeInTheDocument()
            expect(screen.getByRole("button", { name: /Filters/i })).toBeInTheDocument()
            const expandButton = screen.getByRole("button", { name: /Toggle example\/alpha/i })

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
        renderWithRouter(
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
