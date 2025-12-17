import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '~/lib/utils'
import { TimelineView } from '~/components/viewer/TimelineView'
import { useTimelineBeamScrollRegistrar } from '~/components/viewer/TimelineTracingBeam'
import { TimelineItem } from './TimelineItem'
import { dedupeTimelineEvents } from './utils'
import type { AnimatedTimelineListProps, TimelineEvent } from './types'


function buildItemKey(event: TimelineEvent, index: number) {
  return `${event.type}-${event.id ?? index}`
}

export function AnimatedTimelineList({
  events,
  className,
  onSelect,
  searchQuery,
  activeMatchIndex,
  onAddEventToChat,
  searchMatchers,
  getDisplayNumber,
  height = 720,
  flaggedEvents,
  onFlaggedEventClick,
  externalFocusIndex,
}: AnimatedTimelineListProps) {
  const beamScrollRegistrar = useTimelineBeamScrollRegistrar()
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [scrollTarget, setScrollTarget] = useState<number | null>(null)
  const [gradients, setGradients] = useState({ top: 0, bottom: 0 })
  const [beamThumb, setBeamThumb] = useState({ top: 24, height: 140 })
  const dedupedEvents = useMemo(() => dedupeTimelineEvents(events), [events])
  const items = useMemo(
    () => dedupedEvents.map((event, index) => ({ event, index, key: buildItemKey(event, index) })),
    [dedupedEvents],
  )

  const requestScroll = useCallback((index: number) => setScrollTarget(index), [])

  useEffect(() => {
    if (scrollTarget === null) return
    const frame = requestAnimationFrame(() => setScrollTarget(null))
    return () => cancelAnimationFrame(frame)
  }, [scrollTarget])

  useEffect(() => {
    if (activeMatchIndex == null || activeMatchIndex < 0 || activeMatchIndex >= items.length) return
    setExpandedIndex(activeMatchIndex)
    requestScroll(activeMatchIndex)
  }, [activeMatchIndex, items.length, requestScroll])

  useEffect(() => {
    if (externalFocusIndex == null || externalFocusIndex < 0 || externalFocusIndex >= items.length) return
    setExpandedIndex(externalFocusIndex)
    requestScroll(externalFocusIndex)
  }, [externalFocusIndex, items.length, requestScroll])

  const handleScrollChange = ({ scrollTop, totalHeight, height: containerHeight }: { scrollTop: number; totalHeight: number; height: number }) => {
    const top = Math.min(scrollTop / 80, 1)
    const bottomDistance = totalHeight - (scrollTop + containerHeight)
    const bottom = totalHeight <= containerHeight ? 0 : Math.min(bottomDistance / 80, 1)
    setGradients({ top, bottom })
    const denominator = Math.max(totalHeight - containerHeight, 1)
    const ratio = totalHeight <= containerHeight ? 0 : Math.min(Math.max(scrollTop / denominator, 0), 1)
    const visibleRatio = totalHeight <= containerHeight ? 1 : containerHeight / totalHeight
    const nextHeight = Math.max(containerHeight * visibleRatio * 0.6, 60)
    setBeamThumb({ top: ratio * (containerHeight - nextHeight) + 24, height: nextHeight })
  }

  return (
    <div className={cn('relative', className)}>
      <TimelineView
        items={items}
        height={height}
        estimateItemHeight={160}
        keyForIndex={(item) => item.key}
        renderItem={(item) => (
          <TimelineItem
            event={item.event}
            index={item.index}
            expanded={expandedIndex === item.index}
            onToggle={() => {
              setExpandedIndex((prev) => {
                const next = prev === item.index ? null : item.index
                if (next !== null) requestScroll(next)
                return next
              })
              onSelect?.(item.event, item.index)
            }}
            searchQuery={searchQuery}
            onAddEventToChat={onAddEventToChat}
            searchMatchers={searchMatchers}
            getDisplayNumber={getDisplayNumber}
            flaggedEvents={flaggedEvents}
            onFlaggedEventClick={onFlaggedEventClick}
            isActiveMatch={activeMatchIndex === item.index}
          />
        )}
        scrollToIndex={scrollTarget}
        onScrollChange={handleScrollChange}
        className="pr-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        registerScrollContainer={beamScrollRegistrar ?? undefined}
      />
      <div className="pointer-events-none absolute inset-y-6 left-1 w-[3px] rounded-full bg-white/10">
        <motion.span
          aria-hidden
          className="absolute inset-x-0 rounded-full bg-gradient-to-b from-cyan-400 via-purple-500 to-fuchsia-500"
          style={{ top: beamThumb.top, height: beamThumb.height }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-2 top-0 h-16 bg-gradient-to-b from-background to-transparent transition-opacity" style={{ opacity: gradients.top }} />
      <div className="pointer-events-none absolute inset-x-2 bottom-0 h-24 bg-gradient-to-t from-background to-transparent transition-opacity" style={{ opacity: gradients.bottom }} />
    </div>
  )
}

export default AnimatedTimelineList
