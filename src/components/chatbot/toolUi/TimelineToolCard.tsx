import type { StreamingToolCall } from '~/lib/chatbot/chatStreamTypes'

export interface TimelineToolPayload {
  events: {
    eventNumber: number
    heading: string
    summary: string
    context?: {
      eventIndex: number
      displayIndex: number
      eventId?: string
      eventType: string
      summary: string
    }
    eventType: string
  }[]
}

interface TimelineToolCardProps {
  call: StreamingToolCall & { output?: TimelineToolPayload }
}

export function TimelineToolCard({ call }: TimelineToolCardProps) {
  if (!call.output?.events?.length) {
    return null
  }
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 p-3 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Timeline Events</span>
          <span className="text-sm text-foreground">{call.toolName}</span>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{call.status === 'succeeded' ? 'Resolved' : 'Pending'}</span>
      </div>
      <div className="mt-2 space-y-2">
        {call.output.events.map((event) => (
          <div key={`${call.toolCallId}-${event.eventNumber}`} className="rounded-xl border border-border/40 bg-background/80 p-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
              <span>#{event.eventNumber}</span>
              <span className="text-muted-foreground">{event.eventType}</span>
            </div>
            <p className="mt-1 text-sm text-foreground">{event.heading}</p>
            {event.summary ? <p className="text-xs text-muted-foreground">{event.summary}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
