import { useMemo } from 'react'
import type { StreamingToolCall } from '~/lib/chatbot/chatStreamTypes'
import { cn } from '~/lib/utils'

interface ToolCallStreamListProps {
  toolCalls: StreamingToolCall[]
}

const STATUS_STYLES: Record<StreamingToolCall['status'], { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'border-border/60 text-muted-foreground' },
  executing: { label: 'Running', className: 'border-blue-400/60 text-blue-200' },
  succeeded: { label: 'Success', className: 'border-emerald-400/60 text-emerald-200' },
  failed: { label: 'Failed', className: 'border-destructive/60 text-destructive' },
}

export function ToolCallStreamList({ toolCalls }: ToolCallStreamListProps) {
  const ordered = useMemo(() => [...toolCalls].sort((a, b) => a.toolCallId.localeCompare(b.toolCallId)), [toolCalls])
  if (!ordered.length) {
    return null
  }
  return (
    <div className="mt-2 space-y-2">
      {ordered.map((call) => (
        <ToolCallCard key={call.toolCallId} call={call} />
      ))}
    </div>
  )
}

function ToolCallCard({ call }: { call: StreamingToolCall }) {
  const status = STATUS_STYLES[call.status]
  return (
    <div className="rounded-2xl border border-border/60 bg-background/60 p-3 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tool</span>
          <span className="text-sm text-foreground">{call.toolName}</span>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide',
            status.className,
          )}
        >
          {status.label}
        </span>
      </div>
      <div className="mt-2 space-y-1">
        <LabelValue label="Arguments" value={safeJson(call.input)} />
        {call.status === 'succeeded' && call.output ? <LabelValue label="Result" value={safeJson(call.output)} /> : null}
        {call.status === 'failed' && call.error ? <LabelValue label="Error" value={call.error} /> : null}
      </div>
      {call.contextEvents?.length ? (
        <div className="mt-2 flex flex-wrap gap-1 text-[10px] uppercase tracking-wide">
          {call.contextEvents.map((event) => (
            <span
              key={`${call.toolCallId}-${event.displayIndex}-${event.eventId ?? 'event'}`}
              className="inline-flex items-center rounded-full border border-border/50 bg-muted/10 px-2 py-0.5 text-muted-foreground"
            >
              #{event.displayIndex} · {event.eventType}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function LabelValue({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null
  }
  return (
    <div>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <p className="mt-0.5 rounded-xl border border-border/50 bg-background/70 p-2 font-mono text-[11px] text-foreground/90">
        {value}
      </p>
    </div>
  )
}

function safeJson(value: unknown) {
  try {
    if (typeof value === 'string') {
      return value
    }
    return JSON.stringify(value, null, 2)
  } catch {
    return undefined
  }
}
