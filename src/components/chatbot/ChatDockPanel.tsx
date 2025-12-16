import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '~/components/ui/card';
import type { ViewerChatState } from '~/features/viewer/viewer.loader';
import { fetchChatbotState } from '~/server/function/chatbotState';
import { useChatDockController } from '~/components/chatbot/hooks/useChatDockController';
import type { CoachPrefillPayload } from '~/lib/chatbot/types';
import { ChatDockBootstrapCard } from '~/components/chatbot/ChatDockBootstrapCard';
import { ChatDockHeader } from '~/components/chatbot/ChatDockHeader';
import { ChatDockMessages, MisalignmentList } from '~/components/chatbot/ChatDockMessages';
import { ChatDockComposer } from '~/components/chatbot/ChatDockComposer';
import AIChatHistory from '~/components/ui/ai-chat-history';

interface ChatDockPanelProps {
  sessionId: string;
  state?: ViewerChatState | null;
  prefill?: CoachPrefillPayload | null;
  onPrefillConsumed?: () => void;
}

export function ChatDockPanel({
  sessionId,
  state,
  prefill,
  onPrefillConsumed,
}: ChatDockPanelProps) {
  const [bootState, setBootState] = useState<ViewerChatState | null>(state ?? null);
  const [bootStatus, setBootStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    state ? 'ready' : 'loading'
  );
  const [bootError, setBootError] = useState<string | null>(null);

  const hydrateState = useCallback(async () => {
    setBootStatus('loading');
    setBootError(null);
    try {
      const next = await fetchChatbotState({ data: { sessionId, mode: 'session' } });
      setBootState(next);
      setBootStatus('ready');
    } catch (error) {
      setBootError(error instanceof Error ? error.message : 'Failed to load chat state');
      setBootStatus('error');
    }
  }, [sessionId]);

  useEffect(() => {
    if (state) {
      setBootState(state);
      setBootStatus('ready');
      setBootError(null);
      return;
    }
    if (!bootState) {
      void hydrateState();
    }
  }, [state, hydrateState, bootState]);

  if (!bootState) {
    return <ChatDockBootstrapCard status={bootStatus} error={bootError} onRetry={hydrateState} />;
  }

  return (
    <ChatDockContent
      sessionId={sessionId}
      initialState={bootState}
      prefill={prefill}
      onPrefillConsumed={onPrefillConsumed}
    />
  );
}

function ChatDockContent({
  sessionId,
  initialState,
  prefill,
  onPrefillConsumed,
}: {
  sessionId: string;
  initialState: ViewerChatState;
  prefill?: CoachPrefillPayload | null;
  onPrefillConsumed?: () => void;
}) {
  const {
    activeState,
    orderedMessages,
    misalignments,
    draft,
    setDraft,
    placeholderPills,
    vanishText,
    handleVanishComplete,
    isStreaming,
    isResetting,
    streamError,
    showMisalignments,
    activeStreamId,
    availableModels,
    selectedModel,
    selectValue,
    handleModeSwitch,
    handleModelChange,
    handleSend,
    handleTextareaKeyDown,
    handleMisalignmentUpdate,
    handleReset,
    threadId,
    threads,
    handleThreadSelect,
    handleThreadRename,
    handleThreadDelete,
    handleThreadArchive,
  } = useChatDockController({
    sessionId,
    initialState,
    prefill,
    onPrefillConsumed,
  });

  const contextDescription = useMemo(() => {
    const headings = activeState.contextSections?.map((section) => section.heading).join(', ') || 'n/a';
    const repoLabel = activeState.repoContext?.rootDir
      ? truncateLabel(activeState.repoContext.rootDir)
      : 'Unbound repo';
    const sessionLabel = activeState.snapshot?.sessionId ?? sessionId;
    return `Session ${sessionLabel} • ${repoLabel} • Sections: ${headings}`;
  }, [activeState.contextSections, activeState.repoContext, activeState.snapshot, sessionId]);

  const composerPlaceholder =
    activeState.mode === 'session'
      ? "Summarize this session's status"
      : 'Ask anything about the viewer';

  return (
    <Card className="flex h-full flex-col gap-4">
      <ChatDockHeader
        mode={activeState.mode}
        onModeChange={handleModeSwitch}
        isStreaming={isStreaming}
        isResetting={isResetting}
        sessionId={sessionId}
        streamError={streamError}
        availableModels={availableModels}
        selectValue={selectValue}
        onModelChange={handleModelChange}
        selectedModel={selectedModel}
        onReset={handleReset}
        contextDescription={contextDescription}
      />
      <CardContent className="flex flex-1 flex-col gap-4 p-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4 min-w-0">
            <ChatDockMessages
              messages={orderedMessages}
              showEvidence={showMisalignments}
              activeStreamId={activeStreamId}
            />
            <ChatDockComposer
              draft={draft}
              onDraftChange={setDraft}
              onSend={() => void handleSend()}
              isStreaming={isStreaming}
              placeholder={composerPlaceholder}
              onTextareaKeyDown={handleTextareaKeyDown}
              vanishText={vanishText}
              onVanishComplete={handleVanishComplete}
              placeholderPills={placeholderPills}
            />
            {showMisalignments ? (
              <MisalignmentList items={misalignments} onUpdate={handleMisalignmentUpdate} />
            ) : null}
          </div>
          <div className="w-full lg:max-w-sm">
            <AIChatHistory
              activeConversationId={threadId ?? undefined}
              conversations={threads.map((thread) => ({
                id: thread.id,
                title: thread.title,
                lastMessage: thread.lastMessagePreview,
                lastMessageAt: thread.lastMessageAt ? new Date(thread.lastMessageAt) : undefined,
                messageCount: thread.messageCount,
                isArchived: thread.status === 'archived',
                isActive: thread.status === 'active',
              }))}
              onSelect={(conversationId) => handleThreadSelect(conversationId)}
              onNewConversation={() => void handleReset()}
              onRename={(conversationId, newTitle) => handleThreadRename(conversationId, newTitle)}
              onDelete={(conversationId) => handleThreadDelete(conversationId)}
              onArchive={(conversationId) => handleThreadArchive(conversationId)}
              onUnarchive={(conversationId) => handleThreadSelect(conversationId)}
              showNewButton
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function truncateLabel(value: string, maxLength = 48) {
  if (value.length <= maxLength) {
    return value;
  }
  return `…${value.slice(-maxLength)}`;
}
