import { memo, useMemo } from "react"
import type { ResponseItem } from "~/lib/viewer-types"
import { eventKey } from "~/utils/event-key"
import { EventCard } from "./EventCard"
import { TimelineView } from "./TimelineView"

interface TimelineListProps {
    events: readonly ResponseItem[]
    height?: number
}

export const TimelineList = memo(function TimelineList({ events, height = 720 }: TimelineListProps) {
    const items = useMemo(() => events.map((ev, index) => ({ ev, index, key: eventKey(ev, index) })), [events])

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
