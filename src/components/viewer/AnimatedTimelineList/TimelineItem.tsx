import { motion } from 'motion/react'
import { useCallback } from 'react'
import { BorderBeam } from '~/components/ui/border-beam'
import { ShimmerButton } from '~/components/ui/shimmer-button'
import { Button } from '~/components/ui/button'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '~/lib/utils'
import { Badge } from '~/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '~/components/ui/tooltip'
import { buildEventBadges } from '~/lib/session-events/toolMetadata'
import { LocalTimestamp } from '~/components/viewer/LocalTimestamp'
import { SessionOriginBadge } from '~/components/viewer/SessionOriginBadge'
import { getSeverityVisuals } from '~/features/chatbot/severity'
import { TimelineDetail } from './TimelineDetail'
import { buildLabel, buildMetaLine, formatMisalignmentTooltip, safeStringify } from './utils'
import type { TimelineEvent, TimelineFlagMarker } from './types'
import type { SearchMatcher } from '~/utils/search'
import { HighlightedText } from '~/components/ui/highlighted-text'

interface TimelineItemProps {
  event: TimelineEvent
  index: number
  expanded: boolean
  onToggle: () => void
  searchQuery?: string
  onAddEventToChat?: (event: TimelineEvent, index: number) => void
  searchMatchers?: SearchMatcher[]
  getDisplayNumber?: (event: TimelineEvent, index: number) => number | null | undefined
  flaggedEvents?: Map<number, TimelineFlagMarker>
  onFlaggedEventClick?: (marker: TimelineFlagMarker) => void
  isActiveMatch?: boolean
}

export function TimelineItem({
  event,
  index,
  expanded,
  onToggle,
  searchQuery,
  onAddEventToChat,
  searchMatchers,
  getDisplayNumber,
  flaggedEvents,
  onFlaggedEventClick,
  isActiveMatch,
}: TimelineItemProps) {
  const handleAddToChat = useCallback(
    (mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
      mouseEvent.preventDefault()
      mouseEvent.stopPropagation()
      onAddEventToChat?.(event, index)
    },
    [event, index, onAddEventToChat],
  )

  const handleCopyProps = useCallback(
    async (mouseEvent: React.MouseEvent<HTMLButtonElement>) => {
      mouseEvent.preventDefault()
      mouseEvent.stopPropagation()
      const serialized = safeStringify(event) || ''
      if (!serialized) {
        toast.error('Nothing to copy for this event')
        return
      }
      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(serialized)
          toast.success('Event copied')
          return
        }
      } catch (error) {
        toast.error('Failed to copy event', {
          description: error instanceof Error ? error.message : 'Clipboard unavailable',
        })
        return
      }
      toast.error('Clipboard unavailable in this environment')
    },
    [event],
  )

  const origin = event.origin
  const timestampNode = event.at ? (
    <LocalTimestamp
      value={event.at}
      variant="clock"
      includeSeconds
      className="rounded-full border border-white/5 bg-white/5 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
    />
  ) : null
  const eventIndex = typeof (event as { index?: number }).index === 'number' ? (event as { index?: number }).index : null
  const marker = eventIndex != null ? flaggedEvents?.get(eventIndex) : undefined
  const severityVisual = marker ? getSeverityVisuals(marker.severity) : null
  const resolvedDisplayNumber = getDisplayNumber?.(event, index)
  const labelNumber = typeof resolvedDisplayNumber === 'number' && Number.isFinite(resolvedDisplayNumber) ? resolvedDisplayNumber : index + 1
  const eventBadges = buildEventBadges(event)
  const isChattable = ['Message', 'FunctionCall', 'LocalShellCall', 'WebSearchCall', 'CustomToolCall'].includes(event.type)

  return (
    <motion.div
      className="px-1 pb-4"
      initial={{ opacity: 0.6, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      <div
        className={cn(
          'relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-black/30 p-4 transition-shadow duration-200',
          isActiveMatch
            ? 'ring-2 ring-cyan-400/70 shadow-[0_0_35px_rgba(34,211,238,0.35)]'
            : 'ring-1 ring-transparent',
        )}
        onClick={onToggle}
        role="button"
        aria-current={isActiveMatch ? 'true' : undefined}
        tabIndex={0}
        onKeyDown={(keyboardEvent) => {
          if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            keyboardEvent.preventDefault()
            onToggle()
          }
        }}
      >
        <BorderBeam className="opacity-70" size={120} duration={8} borderWidth={1} />
        <div className="relative z-10 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <HighlightedText
                text={buildLabel(event, labelNumber)}
                matchers={searchMatchers}
                className="text-sm font-semibold text-white"
              />
              <HighlightedText
                text={buildMetaLine(event)}
                matchers={searchMatchers}
                className="hidden text-xs text-muted-foreground"
              />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                {timestampNode}
                <span className="rounded-full border border-white/10 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {event.type}
                </span>
              </div>
              {marker && severityVisual ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="outline-none"
                      onClick={(mouseEvent) => {
                        mouseEvent.preventDefault()
                        mouseEvent.stopPropagation()
                        onFlaggedEventClick?.(marker)
                      }}
                    >
                      <Badge
                        variant={severityVisual.badgeVariant}
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wide',
                          severityVisual.textClass,
                          severityVisual.borderClass,
                        )}
                      >
                        {marker.misalignments.length} issue{marker.misalignments.length === 1 ? '' : 's'}
                      </Badge>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{formatMisalignmentTooltip(marker)}</TooltipContent>
                </Tooltip>
              ) : null}
              {isChattable ? (
                <ShimmerButton type="button" className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide" onClick={handleAddToChat}>
                  Add to chat
                </ShimmerButton>
              ) : null}
              <Button type="button" size="sm" variant="ghost" className="text-xs uppercase tracking-wide text-muted-foreground hover:text-white" onClick={handleCopyProps}>
                <Copy className="mr-1 h-3 w-3" />
                Copy props
              </Button>
            </div>
          </div>
          {origin || eventBadges.length ? (
            <div className="flex flex-wrap items-center gap-2">
              {origin ? <SessionOriginBadge origin={origin} size="sm" /> : null}
              {eventBadges.map((badge, badgeIndex) => (
                <Badge
                  key={`${badge.type}-${badge.id ?? badge.label}-${badgeIndex}`}
                  variant={badge.type === 'command' ? 'secondary' : 'outline'}
                  title={badge.title}
                  className={cn('text-[11px] font-medium', badge.type === 'command' ? 'bg-white/15 text-white' : 'text-muted-foreground')}
                >
                  {badge.label}
                </Badge>
              ))}
            </div>
          ) : null}
          {expanded ? (
            <div className="rounded-lg border border-white/5 bg-black/60 p-3 text-sm text-slate-100">
              <TimelineDetail event={event} searchQuery={searchQuery} matchers={searchMatchers} />
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  )
}
