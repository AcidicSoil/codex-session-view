import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ViewerChatState } from '~/features/viewer/viewer.loader';
import type { ChatMode, MisalignmentRecord } from '~/lib/sessions/model';
import type { CoachPrefillPayload, ChatThreadSummary } from '~/lib/chatbot/types';
import { mutateMisalignmentStatus } from '~/server/function/misalignments';
import { fetchChatbotState } from '~/server/function/chatbotState';
import { useChatDockSettings } from '~/stores/chatDockSettings';
import { DEFAULT_CHAT_AI_SETTINGS } from '~/lib/chatbot/aiSettings';
import type { StreamingToolCall } from '~/lib/chatbot/chatStreamTypes';
import { useChatStreamController } from './useChatStreamController';
import type { LocalMessage } from './chatDock.types';
import { useChatThreadController } from './useChatThreadController';

interface UseChatDockControllerOptions {
  sessionId: string;
  initialState: ViewerChatState;
  prefills?: Partial<Record<ChatMode, CoachPrefillPayload | null>>;
  onPrefillConsumed?: (mode: ChatMode) => void;
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
  streamToolCalls: StreamingToolCall[];
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
  handleThreadClear: () => Promise<void>;
  handleNewChat: () => Promise<void>;
}

export function useChatDockController({
  sessionId,
  initialState,
  prefills,
  onPrefillConsumed,
}: UseChatDockControllerOptions): UseChatDockControllerResult {
  const aiSettings = useChatDockSettings((state) => state.aiSettings);
  const setAiSettings = useChatDockSettings((state) => state.setAiSettings);
  const streamParameters = useMemo(() => {
    const { model: _ignored, ...rest } = aiSettings ?? DEFAULT_CHAT_AI_SETTINGS;
    return rest;
  }, [aiSettings]);
  const stateCacheRef = useRef(
    new Map<ChatMode, ViewerChatState>([[initialState.mode, initialState]])
  );
  const [activeState, setActiveState] = useState(initialState);
  const [messages, setMessages] = useState<LocalMessage[]>(() => initialState.messages ?? []);
  const [misalignments, setMisalignments] = useState<MisalignmentRecord[]>(
    () => initialState.misalignments ?? []
  );
  const [draft, setDraftState] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const sessionAnchorRef = useRef(initialState.sessionId);

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
    const storedModel = aiSettings.model;
    if (storedModel && availableModels.some((m) => m.id === storedModel)) {
      return storedModel;
    }
    return activeState.initialModelId ?? availableModels[0]?.id ?? null;
  }, [activeState.initialModelId, aiSettings.model, availableModels]);

  useEffect(() => {
    if (defaultModelId && !selectedModelId) {
      setSelectedModelId(defaultModelId);
    }
  }, [defaultModelId, selectedModelId]);

  const {
    isStreaming,
    activeStreamId,
    streamToolCalls,
    setPendingMetadata,
    vanishText,
    setVanishText,
    handleSend,
    resetStreamState,
  } = useChatStreamController({
    sessionId,
    mode: activeState.mode,
    threadId: activeState.threadId ?? null,
    draft,
    setDraft: setDraftState,
    setMessages,
    loadChatState,
    streamParameters,
    selectedModelId,
    defaultModelId,
    setStreamError,
  });

  useEffect(() => {
    const isSameSession = sessionAnchorRef.current === initialState.sessionId;
    sessionAnchorRef.current = initialState.sessionId;
    if (isSameSession) {
      stateCacheRef.current.set(initialState.mode, initialState);
      setActiveState(initialState);
      setMessages(initialState.messages ?? []);
      if (initialState.mode === 'session') {
        setMisalignments(initialState.misalignments ?? []);
      }
      return;
    }
    stateCacheRef.current = new Map([[initialState.mode, initialState]]);
    setActiveState(initialState);
    setMessages(initialState.messages ?? []);
    setMisalignments(initialState.misalignments ?? []);
    setDraftState('');
    setStreamError(null);
    setSelectedModelId(null);
    resetStreamState();
  }, [initialState, resetStreamState]);

  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModelId(modelId);
      setAiSettings((prev) => ({ ...DEFAULT_CHAT_AI_SETTINGS, ...prev, model: modelId }));
    },
    [setAiSettings]
  );

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
  const {
    handleThreadSelect,
    handleThreadRename,
    handleThreadDelete,
    handleThreadArchive,
    handleThreadClear,
  } = useChatThreadController({
    mode: activeState.mode,
    threadId: activeState.threadId ?? null,
    loadChatState,
    setStreamError,
    setIsResetting,
  });

  const setDraft = useCallback((value: string) => {
    setDraftState(value);
  }, []);

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
      resetStreamState();
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to reset chat');
    } finally {
      setIsResetting(false);
    }
  }, [activeState.mode, loadChatState, resetStreamState]);

  const handleNewChat = useCallback(async () => {
    setStreamError(null);
    setIsResetting(true);
    try {
      await loadChatState(activeState.mode, { reset: true });
      setDraftState('');
      resetStreamState();
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to start new chat');
      throw error;
    } finally {
      setIsResetting(false);
    }
  }, [activeState.mode, loadChatState, resetStreamState]);

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
    [activeState.mode, isStreaming, loadChatState, setPendingMetadata, setVanishText]
  );

  const activePrefill = prefills?.[activeState.mode];

  useEffect(() => {
    if (!activePrefill?.prompt) return;
    setDraftState(activePrefill.prompt);
    setPendingMetadata(activePrefill.metadata);
    onPrefillConsumed?.(activeState.mode);
  }, [activePrefill, onPrefillConsumed, activeState.mode, setPendingMetadata]);

  const handleVanishComplete = useCallback(() => {
    setVanishText(null);
  }, [setVanishText]);

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
    handleThreadClear,
    handleNewChat,
    streamToolCalls,
  };
}
