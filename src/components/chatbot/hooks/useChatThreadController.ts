import { useCallback } from 'react';
import type { ViewerChatState } from '~/features/viewer/viewer.loader';
import type { ChatMode } from '~/lib/sessions/model';
import {
  archiveChatThreadState,
  clearChatThreadState,
  deleteChatThreadState,
  renameChatThreadState,
} from '~/server/function/chatThreadsState';

interface UseChatThreadControllerOptions {
  mode: ChatMode;
  threadId: string | null;
  loadChatState: (mode: ChatMode, options?: { reset?: boolean; threadId?: string }) => Promise<ViewerChatState>;
  setStreamError: (message: string | null) => void;
  setIsResetting: (value: boolean) => void;
}

interface UseChatThreadControllerResult {
  handleThreadSelect: (threadId: string) => Promise<void>;
  handleThreadRename: (threadId: string, title: string) => Promise<void>;
  handleThreadDelete: (threadId: string) => Promise<void>;
  handleThreadArchive: (threadId: string) => Promise<void>;
  handleThreadClear: () => Promise<void>;
}

export function useChatThreadController({
  mode,
  threadId,
  loadChatState,
  setStreamError,
  setIsResetting,
}: UseChatThreadControllerOptions): UseChatThreadControllerResult {
  const handleThreadSelect = useCallback(
    async (nextThreadId: string) => {
      setStreamError(null);
      setIsResetting(true);
      try {
        await loadChatState(mode, { threadId: nextThreadId });
      } catch (error) {
        setStreamError(error instanceof Error ? error.message : 'Failed to load conversation');
        throw error;
      } finally {
        setIsResetting(false);
      }
    },
    [loadChatState, mode, setIsResetting, setStreamError]
  );

  const handleThreadRename = useCallback(
    async (targetThreadId: string, title: string) => {
      await renameChatThreadState({ data: { threadId: targetThreadId, title } });
      await loadChatState(mode, { threadId: threadId ?? undefined });
    },
    [loadChatState, mode, threadId]
  );

  const handleThreadDelete = useCallback(
    async (targetThreadId: string) => {
      const result = await deleteChatThreadState({ data: { threadId: targetThreadId } });
      const nextThreadId =
        result.nextActiveId ?? (targetThreadId === threadId ? undefined : threadId ?? undefined);
      await loadChatState(mode, { threadId: nextThreadId });
    },
    [loadChatState, mode, threadId]
  );

  const handleThreadArchive = useCallback(
    async (targetThreadId: string) => {
      const result = await archiveChatThreadState({ data: { threadId: targetThreadId } });
      const nextThreadId =
        result.nextActiveId ?? (targetThreadId === threadId ? undefined : threadId ?? undefined);
      await loadChatState(mode, { threadId: nextThreadId });
    },
    [loadChatState, mode, threadId]
  );

  const handleThreadClear = useCallback(async () => {
    if (!threadId) {
      return;
    }
    setStreamError(null);
    setIsResetting(true);
    try {
      await clearChatThreadState({ data: { threadId } });
      await loadChatState(mode, { threadId });
    } catch (error) {
      setStreamError(error instanceof Error ? error.message : 'Failed to clear chat');
    } finally {
      setIsResetting(false);
    }
  }, [loadChatState, mode, setIsResetting, setStreamError, threadId]);

  return {
    handleThreadSelect,
    handleThreadRename,
    handleThreadDelete,
    handleThreadArchive,
    handleThreadClear,
  };
}
