import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '~/components/ui/card';
import type { ViewerChatState } from '~/features/viewer/viewer.loader';
import { fetchChatbotState } from '~/server/function/chatbotState';
import { useChatDockController } from '~/components/chatbot/hooks/useChatDockController';
import type { CoachPrefillPayload } from '~/lib/chatbot/types';
import type { ChatMode } from '~/lib/sessions/model';
import { ChatDockBootstrapCard } from '~/components/chatbot/ChatDockBootstrapCard';
import { ChatDockHeader } from '~/components/chatbot/ChatDockHeader';
import { ChatDockMessages, MisalignmentList } from '~/components/chatbot/ChatDockMessages';
import { ChatDockComposer } from '~/components/chatbot/ChatDockComposer';
import { ChatDockCollateral } from '~/components/chatbot/ChatDockCollateral';
import { ChatDockSidebar } from '~/components/chatbot/ChatDockSidebar';
import MotionDrawer from '~/components/ui/motion-drawer';
import { useChatDockSettings } from '~/stores/chatDockSettings';
import { DEFAULT_CHAT_AI_SETTINGS, type ChatAiSettings } from '~/lib/chatbot/aiSettings';
import { providerKeepAlive } from '~/server/function/providerKeepAlive';
import { toast } from 'sonner';
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery';
import type { SessionRepoBindingRecord } from '~/server/persistence/sessionRepoBindings';
import { CoachScrollProvider, CoachScrollRegion } from '~/components/chatbot/CoachScrollRegion';

interface ChatDockPanelProps {
  sessionId: string;
  state?: ViewerChatState | null;
  assets?: DiscoveredSessionAsset[];
  prefills?: Partial<Record<ChatMode, CoachPrefillPayload | null>>;
  onPrefillConsumed?: (mode: ChatMode) => void;
  onPrefillInject?: (payload: CoachPrefillPayload, targets?: ChatMode[] | 'both') => void;
  onRepoContextChange?: (context: SessionRepoBindingRecord | null) => Promise<void> | void;
}

export function ChatDockPanel({
  sessionId,
  state,
  assets,
  prefills,
  onPrefillConsumed,
  onPrefillInject: _onPrefillInject,
  onRepoContextChange,
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
    setBootState(null);
    setBootStatus('loading');
    setBootError(null);
    void hydrateState();
  }, [state, hydrateState, sessionId]);

  if (!bootState) {
    return <ChatDockBootstrapCard status={bootStatus} error={bootError} onRetry={hydrateState} />;
  }

  return (
    <ChatDockContent
      sessionId={sessionId}
      initialState={bootState}
      assets={assets}
      prefills={prefills}
      onPrefillConsumed={onPrefillConsumed}
      onRepoContextChange={onRepoContextChange}
    />
  );
}

function ChatDockContent({
  sessionId,
  initialState,
  assets,
  prefills,
  onPrefillConsumed,
  onRepoContextChange,
}: {
  sessionId: string;
  initialState: ViewerChatState;
  assets?: DiscoveredSessionAsset[];
  prefills?: Partial<Record<ChatMode, CoachPrefillPayload | null>>;
  onPrefillConsumed?: (mode: ChatMode) => void;
  onRepoContextChange?: (context: SessionRepoBindingRecord | null) => Promise<void> | void;
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
    handleThreadClear,
    handleNewChat,
  } = useChatDockController({
    sessionId,
    initialState,
    prefills,
    onPrefillConsumed,
  });
  const aiSettings = useChatDockSettings((state) => state.aiSettings);
  const setAiSettingsStore = useChatDockSettings((state) => state.setAiSettings);
  const keepLoadedProviders = useChatDockSettings((state) => state.keepLoadedProviders);
  const setKeepLoadedProvider = useChatDockSettings((state) => state.setKeepLoaded);

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

  const providerKey = selectedModel?.provider ?? selectedModel?.id ?? 'default-provider';
  const keepLoaded = keepLoadedProviders[providerKey] ?? false;
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const handleAiSettingsChange = useCallback(
    (next: ChatAiSettings) => {
      setAiSettingsStore(next);
    },
    [setAiSettingsStore]
  );
  const handleAiSettingsReset = useCallback(() => {
    setAiSettingsStore(DEFAULT_CHAT_AI_SETTINGS);
  }, [setAiSettingsStore]);
  const handleKeepLoadedToggle = useCallback(
    async (value: boolean) => {
      setKeepLoadedProvider(providerKey, value);
      if (value) {
        try {
          await providerKeepAlive({ data: { providerId: providerKey } });
        } catch (error) {
          toast.error('Failed to keep model loaded', {
            description: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    },
    [providerKey, setKeepLoadedProvider]
  );
  const handleHistoryToggle = useCallback(() => {
    setIsHistoryOpen((prev) => !prev);
  }, []);
  const closeHistoryDrawer = useCallback(() => {
    setIsHistoryOpen(false);
  }, []);
  const handleThreadSelectFromDrawer = useCallback(
    async (targetThreadId: string) => {
      await handleThreadSelect(targetThreadId);
      closeHistoryDrawer();
    },
    [handleThreadSelect, closeHistoryDrawer]
  );
  const handleNewChatFromDrawer = useCallback(async () => {
    await handleNewChat();
    closeHistoryDrawer();
  }, [handleNewChat, closeHistoryDrawer]);
  const handleClearChatFromDrawer = useCallback(async () => {
    await handleThreadClear();
    closeHistoryDrawer();
  }, [handleThreadClear, closeHistoryDrawer]);

  return (
    <CoachScrollProvider>
      <div className="grid h-full gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <Card className="flex h-full min-h-[22rem] flex-col overflow-hidden border border-white/15 bg-background/80">
          <div className="border-b border-white/10 p-4 pb-3">
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
              onClearChat={handleThreadClear}
              onHistoryToggle={handleHistoryToggle}
              isHistoryOpen={isHistoryOpen}
              contextDescription={contextDescription}
            />
          </div>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <CoachScrollRegion
              label="Chat Dock conversation"
              order={1}
              className="h-full"
              outerClassName="flex-1"
              contentClassName="h-full p-0"
              data-testid="coach-scroll-chat"
            >
              <ChatDockMessages
                messages={orderedMessages}
                showEvidence={showMisalignments}
                activeStreamId={activeStreamId}
              />
            </CoachScrollRegion>
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
          </CardContent>
        </Card>
        <CoachScrollRegion
          label="Session controls and assets"
          order={2}
          className="h-full"
          outerClassName="min-h-[18rem]"
          contentClassName="h-full"
          data-testid="coach-scroll-collateral"
        >
          <ChatDockCollateral
            sessionId={sessionId}
            assets={assets ?? []}
            repoContext={initialState.repoContext}
            onRepoContextChange={onRepoContextChange}
            aiSettings={aiSettings}
            onAiSettingsChange={handleAiSettingsChange}
            onAiSettingsReset={handleAiSettingsReset}
            keepLoaded={keepLoaded}
            onKeepLoadedChange={handleKeepLoadedToggle}
            isBusy={isResetting || isStreaming}
          />
        </CoachScrollRegion>
      </div>
      <MotionDrawer
        direction="right"
        width={380}
        overlayColor="rgba(4,5,20,0.75)"
        isOpen={isHistoryOpen}
        onToggle={setIsHistoryOpen}
        showToggleButton={false}
        ariaLabel="Chat history drawer"
        contentClassName="bg-background text-foreground border-l border-border/50 p-0"
        contentPadding="24px"
      >
        <ChatDockSidebar
          className="border-none bg-transparent p-0"
          threads={threads}
          activeThreadId={threadId}
          onSelect={handleThreadSelectFromDrawer}
          onRename={handleThreadRename}
          onDelete={handleThreadDelete}
          onArchive={handleThreadArchive}
          onUnarchive={handleThreadSelect}
          onNewChat={handleNewChatFromDrawer}
          onClearChat={handleClearChatFromDrawer}
          isBusy={isResetting || isStreaming}
        />
      </MotionDrawer>
    </CoachScrollProvider>
  );
}

function truncateLabel(value: string, maxLength = 48) {
  if (value.length <= maxLength) {
    return value;
  }
  return `…${value.slice(-maxLength)}`;
}
