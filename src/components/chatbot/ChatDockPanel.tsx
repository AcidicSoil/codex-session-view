import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { ScrollArea } from '~/components/ui/scroll-area'
import { Textarea } from '~/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group'
import type { ViewerChatState } from '~/features/viewer/viewer.loader'
import type { ChatMessageRecord, ChatMode, MisalignmentRecord } from '~/lib/sessions/model'
import { cn } from '~/lib/utils'
import { mutateMisalignmentStatus } from '~/server/function/misalignments'
import { requestChatStream } from '~/features/chatbot/chatbot.runtime'
import type { ChatRemediationMetadata } from '~/lib/chatbot/types'
import { SummaryPopout, CommitPopout } from '~/components/chatbot/SessionAnalysisPopouts'
import { fetchChatbotState } from '~/server/function/chatbotState'
import { TextGenerateEffect } from '~/components/aceternity/text-generate-effect'
import { PlaceholdersAndVanishInput } from '~/components/chatbot/PlaceholdersAndVanishInput'
import { getSeverityVisuals } from '~/features/chatbot/severity'
import { Loader2 } from 'lucide-react'

interface ChatDockPanelProps {
  sessionId: string
  state?: ViewerChatState | null
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
  const [bootState, setBootState] = useState<ViewerChatState | null>(state ?? null)
  const [bootStatus, setBootStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(state ? 'ready' : 'loading')
  const [bootError, setBootError] = useState<string | null>(null)

  const hydrateState = useCallback(async () => {
    setBootStatus('loading')
    setBootError(null)
    try {
      const next = await fetchChatbotState({ data: { sessionId, mode: 'session' } })
      setBootState(next)
      setBootStatus('ready')
    } catch (error) {
      setBootError(error instanceof Error ? error.message : 'Failed to load chat state')
      setBootStatus('error')
    }
  }, [sessionId])

  useEffect(() => {
    if (state) {
      setBootState(state)
      setBootStatus('ready')
      setBootError(null)
      return
    }
    if (!bootState) {
      void hydrateState()
    }
  }, [state, hydrateState, bootState])

  if (!bootState) {
    return <ChatDockBootstrapCard status={bootStatus} error={bootError} onRetry={hydrateState} />
  }

  return (
    <FeatureEnabledChatDock
      key={`${bootState.sessionId}-${bootState.mode}`}
      sessionId={sessionId}
      initialState={bootState}
      prefill={prefill}
      onPrefillConsumed={onPrefillConsumed}
    />
  )
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
  const stateCacheRef = useRef(new Map<ChatMode, ViewerChatState>([[initialState.mode, initialState]]))
  const [activeState, setActiveState] = useState(initialState)
  const [messages, setMessages] = useState<LocalMessage[]>(() => initialState.messages ?? [])
  const [misalignments, setMisalignments] = useState<MisalignmentRecord[]>(() => initialState.misalignments ?? [])
  const [draft, setDraft] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [pendingMetadata, setPendingMetadata] = useState<ChatRemediationMetadata | undefined>()
  const [vanishText, setVanishText] = useState<string | null>(null)
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null)
  const [isResetting, setIsResetting] = useState(false)
  const assistantMessageIdRef = useRef<string | null>(null)
  const availableModels = useMemo(() => activeState.modelOptions ?? [], [activeState.modelOptions])
  const defaultModelId = useMemo(() => activeState.initialModelId ?? availableModels[0]?.id ?? null, [activeState.initialModelId, availableModels])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(defaultModelId)
  useEffect(() => {
    if (defaultModelId) {
      setSelectedModelId(defaultModelId)
    }
  }, [defaultModelId])
  const selectedModel = useMemo(() => availableModels.find((model) => model.id === (selectedModelId ?? defaultModelId)), [availableModels, selectedModelId, defaultModelId])
  const selectValue = selectedModelId ?? defaultModelId ?? undefined
  const placeholderPills = useMemo(() => activeState.contextSections?.map((section) => section.heading).slice(0, 3) ?? [], [activeState.contextSections])
  const showMisalignments = activeState.mode === 'session'

  const orderedMessages = useMemo(() => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [messages])

  const handleSend = useCallback(async () => {
    setStreamError(null)
    const trimmed = draft.trim()
    if (!trimmed || isStreaming) return
    const resolvedModelId = selectedModelId ?? defaultModelId
    if (!resolvedModelId) {
      setStreamError('No chat models are available. Update your AI configuration.')
      return
    }
    const clientMessageId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `client_${Date.now()}`
    const timestamp = new Date().toISOString()
    const userMessage: LocalMessage = {
      id: clientMessageId,
      clientMessageId,
      sessionId,
      content: trimmed,
      role: 'user',
      mode: activeState.mode,
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
      mode: activeState.mode,
      createdAt: timestamp,
      updatedAt: timestamp,
      pending: true,
    }
    setMessages((current) => [...current, userMessage, assistantMessage])
    setDraft('')
    setVanishText(trimmed)
    setIsStreaming(true)
    setActiveStreamId(assistantMessageId)
    try {
      const stream = await requestChatStream({
        sessionId,
      mode: activeState.mode,
        prompt: trimmed,
        clientMessageId,
        metadata: pendingMetadata,
        modelId: resolvedModelId,
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
      setActiveStreamId(null)
    }
  }, [draft, activeState.mode, isStreaming, pendingMetadata, sessionId, selectedModelId, defaultModelId])

  const handleTextareaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter') return
      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }
      event.preventDefault()
      if (!isStreaming) {
        void handleSend()
      }
    },
    [handleSend, isStreaming],
  )

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

  const handleReset = useCallback(async () => {
    setStreamError(null)
    setIsResetting(true)
    try {
      const refreshed = await fetchChatbotState({ data: { sessionId, mode: activeState.mode, reset: true } })
      setMessages(refreshed.messages ?? [])
      setActiveStreamId(null)
      setPendingMetadata(undefined)
      setVanishText(null)
      if (activeState.mode === 'session') {
        setMisalignments(refreshed.misalignments ?? [])
      }
      stateCacheRef.current.set(activeState.mode, refreshed)
      setActiveState(refreshed)
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to reset chat')
    } finally {
      setIsResetting(false)
    }
  }, [activeState.mode, sessionId])

  const handleModeSwitch = useCallback(
    async (mode: ChatMode) => {
      if (mode === activeState.mode || isStreaming) {
        return
      }
      setStreamError(null)
      setIsResetting(true)
      try {
        const cached = stateCacheRef.current.get(mode)
        const nextState = cached ?? (await fetchChatbotState({ data: { sessionId, mode } }))
        stateCacheRef.current.set(mode, nextState)
        setActiveState(nextState)
        setMessages(nextState.messages ?? [])
        setMisalignments(nextState.misalignments ?? [])
        setDraft('')
        setPendingMetadata(undefined)
        setVanishText(null)
      } catch (error) {
        setStreamError(error instanceof Error ? error.message : 'Failed to switch chat mode')
      } finally {
        setIsResetting(false)
      }
    },
    [activeState.mode, isStreaming, sessionId],
  )

  useEffect(() => {
    if (!prefill?.prompt || activeState.mode !== 'session') return
    setDraft(prefill.prompt)
    setPendingMetadata(prefill.metadata)
    onPrefillConsumed?.()
  }, [prefill, onPrefillConsumed, activeState.mode])

  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="space-y-3 border-b pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <ToggleGroup
                type="single"
                value={activeState.mode}
                onValueChange={(value) => value && handleModeSwitch(value as ChatMode)}
                disabled={isStreaming || isResetting}
              >
                <ToggleGroupItem value="session">Session</ToggleGroupItem>
                <ToggleGroupItem value="general">General</ToggleGroupItem>
              </ToggleGroup>
              <CardTitle className="text-base font-semibold">
                {activeState.mode === 'session' ? 'Session Coach' : 'General Chat'}
              </CardTitle>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeState.mode === 'session'
                ? `Context sections: ${activeState.contextSections?.map((section) => section.heading).join(', ') || 'n/a'}`
                : 'Exploratory mode that bypasses AGENTS remediation context.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectValue}
              onValueChange={(value) => setSelectedModelId(value)}
              disabled={isStreaming || availableModels.length === 0}
            >
              <SelectTrigger size="sm" className="min-w-[170px]">
                <SelectValue placeholder="Select model">
                  {selectedModel ? `${selectedModel.label}` : 'Select model'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.label}</span>
                      <span className="text-xs text-muted-foreground">{model.provider}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeState.mode === 'session' ? (
              <>
                <SummaryPopout sessionId={sessionId} mode={activeState.mode} />
                <CommitPopout sessionId={sessionId} mode={activeState.mode} />
              </>
            ) : null}
            <Button size="sm" variant="outline" onClick={handleReset} disabled={isStreaming || isResetting}>
              {isResetting ? 'Resetting…' : 'New chat'}
            </Button>
          </div>
        </div>
        {selectedModel ? <p className="text-[11px] text-muted-foreground">{selectedModel.description}</p> : null}
        {streamError ? <p className="text-xs text-destructive">{streamError}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <ScrollArea className="flex-1 rounded-2xl border border-border/60 p-3">
          <div className="space-y-3">
            {orderedMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Send a prompt to start the conversation.</p>
            ) : (
              orderedMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  showEvidence={showMisalignments}
                  isActiveStream={activeStreamId === message.id}
                />
              ))
            )}
          </div>
        </ScrollArea>
        <PlaceholdersAndVanishInput vanishText={vanishText} onVanishComplete={() => setVanishText(null)} placeholderPills={placeholderPills} className="w-full">
          <div className="space-y-3">
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder={activeState.mode === 'session' ? "Summarize this session's status" : 'Ask anything about the viewer'}
              disabled={isStreaming}
              rows={3}
            />
            <div className="flex items-center justify-between gap-3">
              <Button onClick={handleSend} disabled={!draft.trim() || isStreaming}>
                {isStreaming ? 'Streaming…' : 'Send'}
              </Button>
              <p className="text-xs text-muted-foreground">Enter sends • Shift+Enter for newline</p>
            </div>
          </div>
        </PlaceholdersAndVanishInput>
        {showMisalignments ? <MisalignmentList items={misalignments} onUpdate={handleMisalignmentUpdate} /> : null}
      </CardContent>
    </Card>
  )
}

function MessageBubble({ message, showEvidence, isActiveStream }: { message: LocalMessage; showEvidence: boolean; isActiveStream: boolean }) {
  const isUser = message.role === 'user'
  const text = message.content || (message.pending ? '…' : '')
  return (
    <div className={`flex flex-col ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{message.role}</span>
      <div className={`mt-1 max-w-full rounded-2xl border border-border/50 px-3 py-2 text-sm shadow-sm ${isUser ? 'bg-primary/10 text-primary-foreground' : 'bg-background/70 text-foreground'}`}>
        {isActiveStream && !isUser ? <TextGenerateEffect text={text || '…'} className="text-sm" once={false} /> : text}
      </div>
      {showEvidence && message.evidence && message.evidence.length > 0 ? <EvidenceList evidence={message.evidence} /> : null}
    </div>
  )
}

function EvidenceList({ evidence }: { evidence: NonNullable<ChatMessageRecord['evidence']> }) {
  return (
    <div className="mt-2 w-full space-y-2 rounded-2xl border border-border/60 bg-muted/10 p-2 text-xs">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Evidence</p>
      <ul className="space-y-2">
        {evidence.map((entry, index) => {
          const visuals = entry.severity ? getSeverityVisuals(entry.severity) : null
          return (
            <li key={`${entry.ruleId ?? 'rule'}-${index}`} className={cn('rounded-xl border bg-background/80 p-2 shadow-sm', visuals?.borderClass)}>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                {entry.ruleId ? <span className="font-semibold">Rule {entry.ruleId}</span> : null}
                {entry.path ? <span>{entry.path}</span> : null}
                {entry.severity ? (
                  <Badge variant="outline" className={cn('border-none px-2 py-0.5', visuals?.textClass)}>
                    {entry.severity}
                  </Badge>
                ) : null}
              </div>
              {entry.snippet ? <p className="mt-1 text-sm text-foreground">{entry.snippet}</p> : null}
            </li>
          )
        })}
      </ul>
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

function ChatDockBootstrapCard({
  status,
  error,
  onRetry,
}: {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  onRetry: () => void
}) {
  const isLoading = status === 'loading' || status === 'idle'
  return (
    <Card className="flex h-full flex-col gap-4">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base font-semibold">Chat dock</CardTitle>
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Preparing Session Coach…' : 'Unable to load Session Coach state.'}
        </p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center justify-center gap-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading chat history…
          </div>
        ) : (
          <Button onClick={onRetry} variant="outline">
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
