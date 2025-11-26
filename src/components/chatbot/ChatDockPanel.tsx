import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Textarea } from '~/components/ui/textarea'
import type { ViewerChatState } from '~/features/viewer/viewer.loader'
import type { ChatMessageRecord, MisalignmentRecord } from '~/lib/sessions/model'
import { mutateMisalignmentStatus } from '~/server/function/misalignments'
import { requestChatStream, type ChatRemediationMetadata } from '~/features/chatbot/chatbot.runtime'
import { ChatDock } from '~/components/viewer/ChatDock'
import { SummaryPopout, CommitPopout } from '~/components/chatbot/SessionAnalysisPopouts'

interface ChatDockPanelProps {
  sessionId: string
  state: ViewerChatState | null | undefined
  prefill?: CoachPrefillPayload | null
  onPrefillConsumed?: () => void
}

interface CoachPrefillPayload {
  prompt: string
  metadata?: ChatRemediationMetadata
}

interface LocalMessage extends ChatMessageRecord {
  pending?: boolean
}

export function ChatDockPanel({ sessionId, state, prefill, onPrefillConsumed }: ChatDockPanelProps) {
  if (!state?.featureEnabled) {
    return <ChatDock />
  }
  return <FeatureEnabledChatDock sessionId={sessionId} initialState={state} prefill={prefill} onPrefillConsumed={onPrefillConsumed} />
}

function FeatureEnabledChatDock({
  sessionId,
  initialState,
  prefill,
  onPrefillConsumed,
}: {
  sessionId: string
  initialState: ViewerChatState
  prefill?: CoachPrefillPayload | null
  onPrefillConsumed?: () => void
}) {
  const [messages, setMessages] = useState<LocalMessage[]>(() => initialState.messages ?? [])
  const [misalignments, setMisalignments] = useState<MisalignmentRecord[]>(() => initialState.misalignments ?? [])
  const [draft, setDraft] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [pendingMetadata, setPendingMetadata] = useState<ChatRemediationMetadata | undefined>()
  const assistantMessageIdRef = useRef<string | null>(null)

  const orderedMessages = useMemo(() => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [messages])

  const handleSend = useCallback(async () => {
    setStreamError(null)
    const trimmed = draft.trim()
    if (!trimmed || isStreaming) return
    const clientMessageId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `client_${Date.now()}`
    const timestamp = new Date().toISOString()
    const userMessage: LocalMessage = {
      id: clientMessageId,
      clientMessageId,
      sessionId,
      content: trimmed,
      role: 'user',
      mode: initialState.mode,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const assistantMessageId = `assistant_${Date.now()}`
    assistantMessageIdRef.current = assistantMessageId
    const assistantMessage: LocalMessage = {
      id: assistantMessageId,
      sessionId,
      content: '',
      role: 'assistant',
      mode: initialState.mode,
      createdAt: timestamp,
      updatedAt: timestamp,
      pending: true,
    }
    setMessages((current) => [...current, userMessage, assistantMessage])
    setDraft('')
    setIsStreaming(true)
    try {
      const stream = await requestChatStream({
        sessionId,
        mode: initialState.mode,
        prompt: trimmed,
        clientMessageId,
        metadata: pendingMetadata,
      })
      setPendingMetadata(undefined)
      if (!stream) {
        throw new Error('Stream unavailable')
      }
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        updateAssistantMessage(assistantMessageId, buffer, setMessages)
      }
      updateAssistantMessage(assistantMessageId, buffer, setMessages, false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setStreamError(message)
      assistantMessageIdRef.current = null
      setMessages((current) => current.filter((msg) => msg.id !== assistantMessageId))
    } finally {
      setIsStreaming(false)
    }
  }, [draft, initialState.mode, isStreaming, pendingMetadata, sessionId])

  const handleMisalignmentUpdate = useCallback(
    async (record: MisalignmentRecord, status: MisalignmentRecord['status']) => {
      if (record.status === status) return
      try {
        const updated = await mutateMisalignmentStatus({
          data: { sessionId, misalignmentId: record.id, status },
        })
        setMisalignments((current) => current.map((item) => (item.id === record.id ? updated ?? item : item)))
      } catch (error) {
        setStreamError(error instanceof Error ? error.message : 'Failed to update misalignment')
      }
    },
    [sessionId],
  )

  useEffect(() => {
    if (!prefill?.prompt) return
    setDraft(prefill.prompt)
    setPendingMetadata(prefill.metadata)
    onPrefillConsumed?.()
  }, [prefill, onPrefillConsumed])

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="space-y-2 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold">Session coach</CardTitle>
            <p className="text-xs text-muted-foreground">
              Mode: {initialState.mode} · Context sections: {initialState.contextSections?.map((section) => section.heading).join(', ') || 'n/a'}
            </p>
          </div>
          <div className="flex gap-2">
            <SummaryPopout sessionId={sessionId} mode={initialState.mode} />
            <CommitPopout sessionId={sessionId} mode={initialState.mode} />
          </div>
        </div>
        {streamError ? <p className="text-xs text-destructive">{streamError}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <ScrollArea className="flex-1 rounded-2xl border border-border/60 p-3">
          <div className="space-y-3">
            {orderedMessages.length === 0 ? <p className="text-sm text-muted-foreground">Send a prompt to start the conversation.</p> : orderedMessages.map((message) => <MessageBubble key={message.id} message={message} />)}
          </div>
        </ScrollArea>
        <div className="space-y-3">
          <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Summarize this session's status" disabled={isStreaming} rows={3} />
          <div className="flex items-center justify-between gap-3">
            <Button onClick={handleSend} disabled={!draft.trim() || isStreaming}>
              {isStreaming ? 'Streaming…' : 'Send'}
            </Button>
          </div>
        </div>
        <MisalignmentList items={misalignments} onUpdate={handleMisalignmentUpdate} />
      </CardContent>
    </Card>
  )
}

function MessageBubble({ message }: { message: LocalMessage }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex flex-col ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{message.role}</span>
      <div className={`mt-1 max-w-full rounded-2xl border border-border/50 px-3 py-2 text-sm shadow-sm ${isUser ? 'bg-primary/10 text-primary-foreground' : 'bg-background/70 text-foreground'}`}>
        {message.content || (message.pending ? '…' : '')}
      </div>
    </div>
  )
}

function MisalignmentList({ items, onUpdate }: { items: MisalignmentRecord[]; onUpdate: (record: MisalignmentRecord, status: MisalignmentRecord['status']) => void }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/10 p-3 text-xs text-muted-foreground">
        No misalignments recorded for this session.
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border/60 bg-background/80 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="font-medium">{item.title}</span>
              <span className="text-xs text-muted-foreground">{item.summary}</span>
            </div>
            <Badge variant="outline" className="uppercase tracking-wide">
              {item.severity}
            </Badge>
          </div>
          <div className="mt-2 flex gap-2">
            <Button size="xs" variant={item.status === 'open' ? 'secondary' : 'outline'} onClick={() => onUpdate(item, 'open')}>
              {item.status === 'open' ? 'Open' : 'Reopen'}
            </Button>
            <Button size="xs" variant={item.status === 'acknowledged' ? 'default' : 'outline'} onClick={() => onUpdate(item, 'acknowledged')}>
              Acknowledge
            </Button>
            <Button size="xs" variant={item.status === 'dismissed' ? 'destructive' : 'outline'} onClick={() => onUpdate(item, 'dismissed')}>
              Dismiss
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function updateAssistantMessage(id: string, content: string, setMessages: React.Dispatch<React.SetStateAction<LocalMessage[]>>, pending = true) {
  setMessages((current) =>
    current.map((message) =>
      message.id === id
        ? {
            ...message,
            content,
            pending,
            updatedAt: new Date().toISOString(),
          }
        : message,
    ),
  )
}
