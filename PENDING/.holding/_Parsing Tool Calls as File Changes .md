# You Asked:

how can we parse the apply_patch tool calls from the timeline list props so the look like the actual files they are attempting to patch instead of shell commands ?

# Gemini Responded:

To address your request, we can intercept the `apply_patch` tool calls within the `TimelineList` component and transform them into `FileChange` events before they are rendered. This will cause them to be displayed using the "FileChange" styling (showing the file path and using the file accent color) instead of the generic raw JSON format of a function call.

I will also update `EventCard.tsx` to ensure that if a `diff` or `code` snippet is present in the file change event, it gets displayed along with the path.

Here are the updated files:

### 1\. `src/components/viewer/TimelineList.tsx`

I've added a `normalizeEvent` function that checks for `FunctionCall` events named `apply_patch` (or `write_file`) and converts them into `FileChange` events.

```typescript
import { memo, useMemo } from "react"
import type { ResponseItem, FunctionCallEvent, FileChangeEvent } from "~/lib/viewer-types"
import { eventKey } from "~/utils/event-key"
import { EventCard } from "./EventCard"
import { TimelineView } from "./TimelineView"

interface TimelineListProps {
    events: readonly ResponseItem[]
    height?: number
}

// Detect tool calls that are actually file operations and transform them
// into FileChange events for better visualization
function normalizeEvent(event: ResponseItem): ResponseItem {
    if (event.type === "FunctionCall") {
        const fn = event as FunctionCallEvent

        // Handle apply_patch or write_file calls
        if (fn.name === "apply_patch" || fn.name === "write_file") {
            const args = fn.args as Record<string, any> | undefined

            if (args?.path && typeof args.path === "string") {
                // Create a synthetic FileChange event
                return {
                    ...event, // Keep original ID, timestamp, etc.
                    type: "FileChange",
                    path: args.path,
                    // Store the diff or content if available to be rendered
                    diff: args.diff || args.content || args.code,
                } as FileChangeEvent
            }
        }
    }
    return event
}

export const TimelineList = memo(function TimelineList({ events, height = 720 }: TimelineListProps) {
    // Apply normalization during the map step
    const items = useMemo(() => events.map((ev, index) => {
        const normalized = normalizeEvent(ev)
        return {
            ev: normalized,
            index,
            key: eventKey(ev, index)
        }
    }), [events])

    return (
        <TimelineView
            items={items}
            height={height}
            estimateItemHeight={140}
            keyForIndex={(item) => item.key}
            renderItem={(item) => (
                <div className="px-1 pb-4">
                    <EventCard item={item.ev} index={item.index} />
                </div>
            )}
        />
    )
})
```

### 2\. `src/components/viewer/EventCard.tsx`

I've updated `renderSummary` for `FileChange` events to display the `diff` if it exists. Previously, it only returned the path.

```typescript
import { Card } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { BorderBeam } from "~/components/ui/border-beam"
import type { MessagePart, ResponseItem } from "~/lib/viewer-types"
import { cn } from "~/lib/utils"
import { formatDateTime } from "~/utils/intl"

function formatTimestamp(value?: string | number) {
    if (!value) return null
    const formatted = formatDateTime(value, { fallback: "" })
    return formatted || String(value)
}

function summarizeShellSnippet(event: Extract<ResponseItem, { type: "LocalShellCall" }>) {
    const preferred = event.stdout?.trim() || event.stderr?.trim() || event.command || ""
    const firstLine = preferred.split("\n").find((line) => line.trim().length > 0) ?? preferred
    return truncateSnippet(firstLine.trim(), 140)
}

function truncateSnippet(value: string, limit = 140) {
    if (!value) return ""
    return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

function renderSummary(event: ResponseItem) {
    switch (event.type) {
        case "Message": {
            const text = typeof event.content === "string"
                ? event.content
                : Array.isArray(event.content)
                    ? event.content
                          .map((part: string | MessagePart) => (typeof part === "string" ? part : part.text ?? ""))
                          .join("\n")
                    : ""
            return text
        }
        case "Reasoning":
            return event.content
        case "FunctionCall":
            return JSON.stringify({ name: event.name, args: event.args }, null, 2)
        case "LocalShellCall":
            return summarizeShellSnippet(event)
        case "FileChange":
            // Updated to show diff/content if available
            if (event.diff) {
                return `${event.path}\n\n${event.diff}`
            }
            return event.path
        case "WebSearchCall":
            return event.query
        default:
            return JSON.stringify(event, null, 2)
    }
}

function typeAccent(type: ResponseItem["type"]) {
    switch (type) {
        case "Message":
            return "bg-muted text-foreground"
        case "LocalShellCall":
            return "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200"
        case "FunctionCall":
            return "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-200"
        case "FileChange":
            return "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200"
        default:
            return "bg-secondary text-secondary-foreground"
    }
}

interface EventCardProps {
    item: ResponseItem
    index: number
}

export function EventCard({ item, index }: EventCardProps) {
    const summary = renderSummary(item)
    const at = formatTimestamp(item.at)
    return (
        <Card className="relative overflow-hidden rounded-lg border bg-card/70 px-4 py-3">
            <BorderBeam className="opacity-80" size={120} duration={8} borderWidth={1.5} />
            <div className="relative z-10 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className={cn("px-2 py-0.5 text-[11px] uppercase tracking-wide", typeAccent(item.type))}>
                        {item.type}
                    </Badge>
                    <span>#{index + 1}</span>
                    {item.type === "Message" && typeof (item as any).role === "string" ? <span>{(item as any).role}</span> : null}
                    {at ? <span>{at}</span> : null}
                </div>
                <div className="space-y-2">
                    {item.type === "Message" ? (
                        <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 text-sm leading-relaxed">
                            {summary}
                        </pre>
                    ) : (
                        summary && (
                            <pre className="max-h-64 overflow-auto rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                                {summary}
                            </pre>
                        )
                    )}
                    {!summary && <p className="text-sm text-muted-foreground">No additional details</p>}
                </div>
            </div>
        </Card>
    )
}
```

---
