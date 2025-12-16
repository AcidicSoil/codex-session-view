import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import type { ViewerChatState } from '~/features/viewer/viewer.loader';
import type { ChatMessageRecord, ChatMode, MisalignmentRecord } from '~/lib/sessions/model';
import type { ChatRemediationMetadata, CoachPrefillPayload, ChatThreadSummary } from '~/lib/chatbot/types';
import { mutateMisalignmentStatus } from '~/server/function/misalignments';
import { requestChatStream } from '~/features/chatbot/chatbot.runtime';
import { fetchChatbotState } from '~/server/function/chatbotState';
import {
  archiveChatThreadState,
  deleteChatThreadState,
  renameChatThreadState,
} from '~/server/function/chatThreadsState';

export interface LocalMessage extends ChatMessageRecord {
  pending?: boolean;
}

export const STORAGE_KEY_MODEL_PREF = 'codex-session-view:model-preference';

interface UseChatDockControllerOptions {
  sessionId: string;
  initialState: ViewerChatState;
  prefill?: CoachPrefillPayload | null;
  onPrefillConsumed?: () => void;
}

export interface UseChatDockControllerResult {
  activeState: ViewerChatState;
  orderedMessages: LocalMessage[];
  misalignments: MisalignmentRecord[];
  draft: string;
  setDraft: (value: string) => void;
  placeholderPills: string[];
  vanishText: string | null;
  handleVanishComplete: () => void;
  isStreaming: boolean;
  isResetting: boolean;
  streamError: string | null;
  showMisalignments: boolean;
  activeStreamId: string | null;
  availableModels: NonNullable<ViewerChatState['modelOptions']>;
  selectedModelId: string | null;
  selectedModel: ViewerChatState['modelOptions'][number] | undefined;
  selectValue: string | undefined;
  handleModeSwitch: (mode: ChatMode) => void;
  handleModelChange: (modelId: string) => void;
  handleSend: () => Promise<void>;
  handleTextareaKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleMisalignmentUpdate: (
    record: MisalignmentRecord,
    status: MisalignmentRecord['status']
  ) => void;
  handleReset: () => Promise<void>;
  threadId: string | null;
  threads: ChatThreadSummary[];
  handleThreadSelect: (threadId: string) => Promise<void>;
  handleThreadRename: (threadId: string, title: string) => Promise<void>;
  handleThreadDelete: (threadId: string) => Promise<void>;
  handleThreadArchive: (threadId: string) => Promise<void>;
}

export function useChatDockController({
  sessionId,
  initialState,
  prefill,
  onPrefillConsumed,
}: UseChatDockControllerOptions): UseChatDockControllerResult {
  const stateCacheRef = useRef(
    new Map<ChatMode, ViewerChatState>([[initialState.mode, initialState]])
  );
  const [activeState, setActiveState] = useState(initialState);
  const [messages, setMessages] = useState<LocalMessage[]>(() => initialState.messages ?? []);
  const [misalignments, setMisalignments] = useState<MisalignmentRecord[]>(
    () => initialState.misalignments ?? []
  );
  const [draft, setDraftState] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [pendingMetadata, setPendingMetadata] = useState<ChatRemediationMetadata | undefined>();
  const [vanishText, setVanishText] = useState<string | null>(null);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);

  const availableModels = useMemo(
    () => activeState.modelOptions ?? [],
    [activeState.modelOptions]
  );

  const loadChatState = useCallback(
    async (mode: ChatMode, options?: { reset?: boolean; threadId?: string }) => {
      const nextState = await fetchChatbotState({
        data: {
          sessionId,
          mode,
          reset: options?.reset,
          threadId: options?.threadId,
        },
      });
      stateCacheRef.current.set(mode, nextState);
      setActiveState(nextState);
      setMessages(nextState.messages ?? []);
      if (mode === 'session') {
        setMisalignments(nextState.misalignments ?? []);
      }
      return nextState;
    },
    [sessionId]
  );

  // Initialize from LocalStorage if available, otherwise fall back to server default
  const defaultModelId = useMemo(() => {
    if (typeof window !== 'undefined') {
      const persisted = localStorage.getItem(STORAGE_KEY_MODEL_PREF);
      if (persisted && availableModels.some((m) => m.id === persisted)) {
        return persisted;
      }
    }
    return activeState.initialModelId ?? availableModels[0]?.id ?? null;
  }, [activeState.initialModelId, availableModels]);

  useEffect(() => {
    if (defaultModelId && !selectedModelId) {
      setSelectedModelId(defaultModelId);
    }
  }, [defaultModelId, selectedModelId]);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MODEL_PREF, modelId);
    }
  }, []);

  const selectedModel = useMemo(
    () => availableModels.find((model) => model.id === (selectedModelId ?? defaultModelId)),
    [availableModels, selectedModelId, defaultModelId]
  );
  const selectValue = selectedModelId ?? defaultModelId ?? undefined;

  const placeholderPills = useMemo(
    () => activeState.contextSections?.map((section) => section.heading).slice(0, 3) ?? [],
    [activeState.contextSections]
  );
  const showMisalignments = activeState.mode === 'session';

  const orderedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [messages]
  );

  const updateAssistantMessage = useCallback(
    (id: string, content: string, pending = true) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === id
            ? {
                ...message,
                content,
                pending,
                updatedAt: new Date().toISOString(),
              }
            : message
        )
      );
    },
    []
  );

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
  }, []);

  const handleSend = useCallback(async () => {
    setStreamError(null);
    const trimmed = draft.trim();
    if (!trimmed || isStreaming) return;
    const resolvedModelId = selectedModelId ?? defaultModelId;
    if (!resolvedModelId) {
      setStreamError('No chat models are available. Update your AI configuration.');
      return;
    }
    const clientMessageId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `client_${Date.now()}`;
    const timestamp = new Date().toISOString();
    const userMessage: LocalMessage = {
      id: clientMessageId,
      clientMessageId,
      sessionId,
      content: trimmed,
      role: 'user',
      mode: activeState.mode,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const assistantMessageId = `assistant_${Date.now()}`;
    assistantMessageIdRef.current = assistantMessageId;
    const assistantMessage: LocalMessage = {
      id: assistantMessageId,
      sessionId,
      content: '',
      role: 'assistant',
      mode: activeState.mode,
      createdAt: timestamp,
      updatedAt: timestamp,
      pending: true,
    };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraftState('');
    setVanishText(trimmed);
    setIsStreaming(true);
    setActiveStreamId(assistantMessageId);
    try {
      const stream = await requestChatStream({
        sessionId,
        mode: activeState.mode,
        prompt: trimmed,
        clientMessageId,
        metadata: pendingMetadata,
        modelId: resolvedModelId,
        threadId: activeState.threadId ?? undefined,
      });
      setPendingMetadata(undefined);
      if (!stream) {
        throw new Error('Stream unavailable');
      }
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        updateAssistantMessage(assistantMessageId, buffer);
      }
      updateAssistantMessage(assistantMessageId, buffer, false);

      await loadChatState(activeState.mode, { threadId: activeState.threadId ?? undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStreamError(message);
      assistantMessageIdRef.current = null;
      setMessages((current) => current.filter((msg) => msg.id !== assistantMessageId));
    } finally {
      setIsStreaming(false);
      setActiveStreamId(null);
    }
  }, [
    draft,
    activeState.mode,
    activeState.threadId,
    isStreaming,
    pendingMetadata,
    sessionId,
    selectedModelId,
    defaultModelId,
    updateAssistantMessage,
    loadChatState,
  ]);

  const handleTextareaKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== 'Enter') return;
      if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      event.preventDefault();
      if (!isStreaming) {
        void handleSend();
      }
    },
    [handleSend, isStreaming]
  );

  const handleMisalignmentUpdate = useCallback(
    async (record: MisalignmentRecord, status: MisalignmentRecord['status']) => {
      if (record.status === status) return;
      try {
        const updated = await mutateMisalignmentStatus({
          data: { sessionId, misalignmentId: record.id, status },
        });
        setMisalignments((current) =>
          current.map((item) => (item.id === record.id ? (updated ?? item) : item))
        );
      } catch (error) {
        setStreamError(error instanceof Error ? error.message : 'Failed to update misalignment');
      }
    },
    [sessionId]
  );

  const handleReset = useCallback(async () => {
    setStreamError(null);
    setIsResetting(true);
    try {
      await loadChatState(activeState.mode, { reset: true });
      setActiveStreamId(null);
      setPendingMetadata(undefined);
      setVanishText(null);
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to reset chat');
    } finally {
      setIsResetting(false);
    }
  }, [activeState.mode, loadChatState]);

  const handleModeSwitch = useCallback(
    async (mode: ChatMode) => {
      if (mode === activeState.mode || isStreaming) {
        return;
      }
      setStreamError(null);
      setIsResetting(true);
      try {
        const cached = stateCacheRef.current.get(mode);
        if (cached) {
          setActiveState(cached);
          setMessages(cached.messages ?? []);
          setMisalignments(cached.misalignments ?? []);
        } else {
          await loadChatState(mode);
        }
        setDraftState('');
        setPendingMetadata(undefined);
        setVanishText(null);
      } catch (error) {
        setStreamError(error instanceof Error ? error.message : 'Failed to switch chat mode');
      } finally {
        setIsResetting(false);
      }
    },
    [activeState.mode, isStreaming, loadChatState]
  );

  useEffect(() => {
    if (!prefill?.prompt || activeState.mode !== 'session') return;
    setDraftState(prefill.prompt);
    setPendingMetadata(prefill.metadata);
    onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed, activeState.mode]);

  const handleVanishComplete = useCallback(() => {
    setVanishText(null);
  }, []);

  const handleThreadSelect = useCallback(
    async (threadId: string) => {
      setStreamError(null);
      setIsResetting(true);
      try {
        await loadChatState(activeState.mode, { threadId });
      } catch (error) {
        setStreamError(error instanceof Error ? error.message : 'Failed to load conversation');
        throw error;
      } finally {
        setIsResetting(false);
      }
    },
    [activeState.mode, loadChatState]
  );

  const handleThreadRename = useCallback(
    async (threadId: string, title: string) => {
      await renameChatThreadState({ data: { threadId, title } });
      await loadChatState(activeState.mode, { threadId: activeState.threadId ?? undefined });
    },
    [activeState.mode, activeState.threadId, loadChatState]
  );

  const handleThreadDelete = useCallback(
    async (threadId: string) => {
      const result = await deleteChatThreadState({ data: { threadId } });
      const nextThreadId =
        result.nextActiveId ?? (threadId === activeState.threadId ? undefined : activeState.threadId ?? undefined);
      await loadChatState(activeState.mode, { threadId: nextThreadId });
    },
    [activeState.mode, activeState.threadId, loadChatState]
  );

  const handleThreadArchive = useCallback(
    async (threadId: string) => {
      const result = await archiveChatThreadState({ data: { threadId } });
      const nextThreadId =
        result.nextActiveId ?? (threadId === activeState.threadId ? undefined : activeState.threadId ?? undefined);
      await loadChatState(activeState.mode, { threadId: nextThreadId });
    },
    [activeState.mode, activeState.threadId, loadChatState]
  );

  return {
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
    selectedModelId,
    selectedModel,
    selectValue,
    handleModeSwitch,
    handleModelChange,
    handleSend,
    handleTextareaKeyDown,
    handleMisalignmentUpdate,
    handleReset,
    threadId: activeState.threadId ?? null,
    threads: activeState.threads ?? [],
    handleThreadSelect,
    handleThreadRename,
    handleThreadDelete,
    handleThreadArchive,
  };
}
