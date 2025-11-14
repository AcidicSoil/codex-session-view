import { createFileRoute } from "@tanstack/react-router"
import { useCallback, useMemo } from "react"
import { DiscoveryPanel } from "~/components/viewer/DiscoveryPanel"
import { DropZone } from "~/components/viewer/DropZone"
import { FileInputButton } from "~/components/viewer/FileInputButton"
import { TimelineList } from "~/components/viewer/TimelineList"
import { ChatDock } from "~/components/viewer/ChatDock"
import { useFileLoader } from "~/hooks/useFileLoader"
import { discoverProjectAssets } from "~/lib/viewerDiscovery"
import { seo } from "~/utils/seo"
import { z } from "zod"

const searchSchema = z.object({
    query: z.string().optional()
})

export const Route = createFileRoute("/(site)/viewer")({
    validateSearch: (search) => {
        const result = searchSchema.safeParse(search)
        if (!result.success) {
            return { query: "" }
        }
        return {
            query: result.data.query?.trim() ?? ""
        }
    },
    loader: () => discoverProjectAssets(),
    head: () => ({
        meta: seo({
            title: "Codex Session Viewer · Discovery",
            description: "Explore workspace files and session logs detected at build time."
        })
    }),
    component: ViewerRouteComponent
})

function ViewerRouteComponent() {
    const data = Route.useLoaderData()
    const search = Route.useSearch()
    const navigate = Route.useNavigate()
    const loader = useFileLoader()

    const handleQueryChange = (next: string) => {
        navigate({
            search: (prev) => ({
                ...prev,
                query: next
            })
        })
    }

    const handleFile = useCallback(
        (file: File) => {
            loader.start(file)
        },
        [loader]
    )

    const meta = loader.state.meta
    const hasEvents = loader.state.events.length > 0
    const progressLabel =
        loader.state.phase === "parsing"
            ? `Parsing… (${loader.progress.ok.toLocaleString()} ok / ${loader.progress.fail.toLocaleString()} errors)`
            : loader.state.phase === "success"
              ? `Loaded ${loader.state.events.length.toLocaleString()} events`
              : loader.state.phase === "error" && loader.progress.fail > 0
                ? `Finished with ${loader.progress.fail.toLocaleString()} errors`
                : "Idle"

    const timelineContent = useMemo(() => {
        if (loader.state.phase === "parsing") {
            return <p className="text-sm text-muted-foreground">Streaming events… large sessions may take a moment.</p>
        }
        if (!hasEvents) {
            return <p className="text-sm text-muted-foreground">Load a session to populate the timeline.</p>
        }
        return <TimelineList events={loader.state.events} />
    }, [loader.state.phase, loader.state.events, hasEvents])

    return (
        <main className="container mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10">
            <section className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Codex Session Viewer</p>
                <h1 className="text-3xl font-bold tracking-tight">Workspace Discovery</h1>
                <p className="text-muted-foreground">
                    This is the first slice of the migration: project files and session logs are fetched in the route loader so hydration never
                    flashes loading spinners. Drop in a session to stream its timeline, then iterate with the chat dock.
                </p>
            </section>

            <DiscoveryPanel
                projectFiles={data.projectFiles}
                sessionAssets={data.sessionAssets}
                query={search.query}
                onQueryChange={handleQueryChange}
            />

            <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <div className="flex flex-col gap-6">
                    <div className="grid gap-4 md:grid-cols-[2fr,auto]">
                        <DropZone onFile={handleFile} className="md:col-span-1" />
                        <div className="flex flex-col gap-4 rounded-xl border bg-card/70 p-5">
                            <div className="space-y-2">
                                <p className="text-sm font-semibold">Session controls</p>
                                <p className="text-xs text-muted-foreground">Upload a .jsonl/.ndjson session log to hydrate the timeline.</p>
                            </div>
                            <FileInputButton onFile={handleFile} disabled={loader.state.phase === "parsing"} />
                            <dl className="space-y-2 text-sm">
                                <div className="flex items-center justify-between">
                                    <dt className="text-muted-foreground">Status</dt>
                                    <dd>{progressLabel}</dd>
                                </div>
                                {meta?.timestamp ? (
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Timestamp</dt>
                                        <dd>{new Date(meta.timestamp).toLocaleString()}</dd>
                                    </div>
                                ) : null}
                                {meta?.git?.repo ? (
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Repo</dt>
                                        <dd>{meta.git.repo}</dd>
                                    </div>
                                ) : null}
                            </dl>
                        </div>
                    </div>

                    <div className="rounded-2xl border p-4">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold">Timeline</p>
                                <p className="text-xs text-muted-foreground">Virtualized list of parsed events.</p>
                            </div>
                        </div>
                        {timelineContent}
                    </div>
                </div>

                <ChatDock />
            </section>
        </main>
    )
}
