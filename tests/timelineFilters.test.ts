import { describe, expect, it } from "vitest"
import { applyTimelineFilters, type TimelineFilterValue } from "~/components/viewer/TimelineFilters"
import type { Filter } from "~/components/ui/filters"
import type { ResponseItem } from "~/lib/viewer-types"

describe("applyTimelineFilters", () => {
    const events: ResponseItem[] = [
        { type: "Message", role: "user", content: "hi" },
        { type: "Reasoning", content: "thinking" },
        { type: "FunctionCall", name: "tool", args: { foo: "bar" } },
        { type: "LocalShellCall", command: "ls" },
        { type: "WebSearchCall", query: "search" },
        { type: "CustomToolCall", toolName: "custom" },
        { type: "FileChange", path: "README.md" },
        { type: "Other", data: { note: "misc" } },
    ]

    function applyTypeFilter(value: string) {
        const filters: Filter<TimelineFilterValue>[] = [
            { id: "type", field: "type", operator: "is", values: [value] },
        ]
        return applyTimelineFilters(events, { filters, quickFilter: "all" })
    }

    const eventTypes = [
        "Message",
        "Reasoning",
        "FunctionCall",
        "LocalShellCall",
        "WebSearchCall",
        "CustomToolCall",
        "FileChange",
        "Other",
    ] as const

    it.each(eventTypes)("returns only %s events when filtered", (type) => {
        const filtered = applyTypeFilter(type)
        expect(filtered).toHaveLength(1)
        expect(filtered[0].type).toBe(type)
    })

    it("quick filter 'messages' returns only message events", () => {
        const filtered = applyTimelineFilters(events, { filters: [], quickFilter: "messages" })
        expect(filtered).toHaveLength(1)
        expect(filtered[0].type).toBe("Message")
    })

    it("quick filter 'tools' returns tool-like events", () => {
        const filtered = applyTimelineFilters(events, { filters: [], quickFilter: "tools" })
        const types = filtered.map((event) => event.type)
        expect(types).toEqual(["FunctionCall", "LocalShellCall", "WebSearchCall", "CustomToolCall"])
    })

    it("quick filter 'files' returns file events", () => {
        const filtered = applyTimelineFilters(events, { filters: [], quickFilter: "files" })
        expect(filtered).toHaveLength(1)
        expect(filtered[0].type).toBe("FileChange")
    })

    it("quick filter 'all' returns every event", () => {
        const filtered = applyTimelineFilters(events, { filters: [], quickFilter: "all" })
        expect(filtered).toHaveLength(events.length)
    })
})
