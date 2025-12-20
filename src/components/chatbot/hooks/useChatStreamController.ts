import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useRef, useState } from 'react';
import type { ViewerChatState } from '~/features/viewer/viewer.loader';
import { requestChatStream } from '~/features/chatbot/chatbot.runtime';
import type { ChatAiSettings } from '~/lib/chatbot/aiSettings';
import type { ChatRemediationMetadata } from '~/lib/chatbot/types';
import type { ChatStreamChunk, StreamingToolCall } from '~/lib/chatbot/chatStreamTypes';
import type { ChatEventReference, ChatMode } from '~/lib/sessions/model';
import type { LocalMessage } from './chatDock.types';

interface UseChatStreamControllerOptions {
  sessionId: string;
  mode: ChatMode;
  threadId: string | null;
  draft: string;
  setDraft: (value: string) => void;
  setMessages: Dispatch<SetStateAction<LocalMessage[]>>;
  loadChatState: (mode: ChatMode, options?: { reset?: boolean; threadId?: string }) => Promise<ViewerChatState>;
  streamParameters: Omit<ChatAiSettings, 'model'>;
  selectedModelId: string | null;
  defaultModelId: string | null;
  setStreamError: (message: string | null) => void;
}

interface UseChatStreamControllerResult {
  isStreaming: boolean;
  activeStreamId: string | null;
  streamToolCalls: StreamingToolCall[];
  pendingMetadata: ChatRemediationMetadata | undefined;
  setPendingMetadata: Dispatch<SetStateAction<ChatRemediationMetadata | undefined>>;
  vanishText: string | null;
  setVanishText: Dispatch<SetStateAction<string | null>>;
  handleSend: () => Promise<void>;
  resetStreamState: () => void;
}

export function useChatStreamController({
  sessionId,
  mode,
  threadId,
  draft,
  setDraft,
  setMessages,
  loadChatState,
  streamParameters,
  selectedModelId,
  defaultModelId,
  setStreamError,
}: UseChatStreamControllerOptions): UseChatStreamControllerResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [streamToolCalls, setStreamToolCalls] = useState<StreamingToolCall[]>([]);
  const [pendingMetadata, setPendingMetadata] = useState<ChatRemediationMetadata | undefined>();
  const [vanishText, setVanishText] = useState<string | null>(null);
  const assistantMessageIdRef = useRef<string | null>(null);
  const contextAccumulator = useRef<ChatEventReference[] | undefined>(undefined);

  const mergeContextEvents = useCallback((existing: ChatEventReference[] | undefined, incoming?: ChatEventReference[]) => {
    if (!incoming?.length) {
      return existing;
    }
    const seen = new Set<string>();
    const merged: ChatEventReference[] = [];
    const add = (entry: ChatEventReference) => {
      const key = `${entry.eventId ?? 'event'}:${entry.displayIndex}:${entry.eventIndex}`;
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      merged.push(entry);
    };
    existing?.forEach(add);
    incoming.forEach(add);
    const previous = existing ?? [];
    const hasChanges = merged.length !== previous.length || merged.some((entry, index) => entry !== previous[index]);
    return hasChanges ? merged : existing ?? merged;
  }, []);

  const updateAssistantMessage = useCallback(
    (
      id: string,
      updates: {
        content?: string;
        pending?: boolean;
        contextEvents?: ChatEventReference[];
      }
    ) => {
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== id) {
            return message;
          }
          let hasChanges = false;
          const next: LocalMessage = { ...message };
          if (typeof updates.content !== 'undefined' && updates.content !== message.content) {
            next.content = updates.content;
            hasChanges = true;
          }
          if (typeof updates.pending !== 'undefined' && updates.pending !== message.pending) {
            next.pending = updates.pending;
            hasChanges = true;
          }
          if (updates.contextEvents?.length) {
            const merged = mergeContextEvents(message.contextEvents, updates.contextEvents);
            if (merged !== message.contextEvents) {
              next.contextEvents = merged;
              hasChanges = true;
            }
          }
          if (!hasChanges) {
            return message;
          }
          next.updatedAt = new Date().toISOString();
          return next;
        })
      );
    },
    [mergeContextEvents, setMessages]
  );

  const resetStreamState = useCallback(() => {
    setIsStreaming(false);
    setActiveStreamId(null);
    setStreamToolCalls([]);
    setPendingMetadata(undefined);
    setVanishText(null);
    assistantMessageIdRef.current = null;
    contextAccumulator.current = undefined;
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
      mode,
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
      mode,
      createdAt: timestamp,
      updatedAt: timestamp,
      pending: true,
    };
    setMessages((current) => [...current, userMessage, assistantMessage]);
    setDraft('');
    setVanishText(trimmed);
    setIsStreaming(true);
    setActiveStreamId(assistantMessageId);
    setStreamToolCalls([]);
    contextAccumulator.current = undefined;
    try {
      const stream = await requestChatStream({
        sessionId,
        mode,
        prompt: trimmed,
        clientMessageId,
        metadata: pendingMetadata,
        modelId: resolvedModelId,
        threadId: threadId ?? undefined,
        parameters: streamParameters,
      });
      setPendingMetadata(undefined);
      if (!stream) {
        throw new Error('Stream unavailable');
      }
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let remainder = '';
      let assistantBuffer = '';
      const appendContextEvents = (events?: ChatEventReference[]) => {
        if (!events?.length) {
          return;
        }
        contextAccumulator.current = mergeContextEvents(contextAccumulator.current, events);
        updateAssistantMessage(assistantMessageId, { contextEvents: contextAccumulator.current });
      };
      const handleChunk = (line: string) => {
        if (!line.trim()) return;
        try {
          const chunk = JSON.parse(line) as ChatStreamChunk;
          switch (chunk.type) {
            case 'text-delta':
              assistantBuffer += chunk.value;
              updateAssistantMessage(assistantMessageId, { content: assistantBuffer });
              break;
            case 'tool-call':
              setStreamToolCalls((current) => [
                ...current.filter((tool) => tool.toolCallId !== chunk.toolCallId),
                {
                  toolCallId: chunk.toolCallId,
                  toolName: chunk.toolName,
                  input: chunk.input,
                  providerExecuted: chunk.providerExecuted,
                  dynamic: chunk.dynamic,
                  status: 'executing',
                },
              ]);
              break;
            case 'tool-result':
            case 'tool-error':
              setStreamToolCalls((current) =>
                current.map((tool) =>
                  tool.toolCallId === chunk.toolCallId
                    ? {
                        ...tool,
                        status: chunk.type === 'tool-result' ? 'succeeded' : 'failed',
                        output: chunk.type === 'tool-result' ? chunk.output : tool.output,
                        error: chunk.type === 'tool-error' ? chunk.error : undefined,
                        contextEvents:
                          chunk.type === 'tool-result' ? chunk.contextEvents ?? tool.contextEvents : tool.contextEvents,
                      }
                    : tool,
                ),
              );
              if (chunk.type === 'tool-result') {
                appendContextEvents(chunk.contextEvents);
              }
              break;
            case 'error':
              setStreamError(chunk.message);
              break;
            default:
              break;
          }
        } catch (error) {
          setStreamError(error instanceof Error ? error.message : 'Failed to parse stream chunk');
        }
      };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        remainder += decoder.decode(value, { stream: true });
        let newline = remainder.indexOf('\n');
        while (newline >= 0) {
          const line = remainder.slice(0, newline);
          remainder = remainder.slice(newline + 1);
          handleChunk(line);
          newline = remainder.indexOf('\n');
        }
      }
      if (remainder.trim()) {
        handleChunk(remainder);
      }
      updateAssistantMessage(assistantMessageId, { content: assistantBuffer, pending: false });

      await loadChatState(mode, { threadId: threadId ?? undefined });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setStreamError(message);
      assistantMessageIdRef.current = null;
      setMessages((current) => current.filter((msg) => msg.id !== assistantMessageId));
    } finally {
      setIsStreaming(false);
      setActiveStreamId(null);
      setStreamToolCalls([]);
      contextAccumulator.current = undefined;
    }
  }, [
    defaultModelId,
    draft,
    isStreaming,
    loadChatState,
    mode,
    pendingMetadata,
    selectedModelId,
    sessionId,
    setDraft,
    setMessages,
    setStreamError,
    streamParameters,
    threadId,
    updateAssistantMessage,
    mergeContextEvents,
  ]);

  return {
    isStreaming,
    activeStreamId,
    streamToolCalls,
    pendingMetadata,
    setPendingMetadata,
    vanishText,
    setVanishText,
    handleSend,
    resetStreamState,
  };
}
