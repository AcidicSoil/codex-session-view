import { Button } from '~/components/ui/button';
import AIChatHistory from '~/components/ui/ai-chat-history';
import type { ChatThreadSummary } from '~/lib/chatbot/types';

interface ChatDockSidebarProps {
  threads: ChatThreadSummary[]
  activeThreadId: string | null
  onSelect: (threadId: string) => void
  onRename: (threadId: string, title: string) => Promise<void>
  onDelete: (threadId: string) => Promise<void>
  onArchive: (threadId: string) => Promise<void>
  onUnarchive: (threadId: string) => Promise<void>
  onNewChat: () => void
  onClearChat: () => void
  isBusy: boolean
}

export function ChatDockSidebar({
  threads,
  activeThreadId,
  onSelect,
  onRename,
  onDelete,
  onArchive,
  onUnarchive,
  onNewChat,
  onClearChat,
  isBusy,
}: ChatDockSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-3 rounded-2xl border border-border/50 bg-background/70 p-3">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">History</p>
            <p className="text-sm font-medium text-foreground">Saved conversations</p>
          </div>
          <Button size="sm" onClick={onNewChat} disabled={isBusy}>
            {isBusy ? 'Starting…' : 'New chat'}
          </Button>
        </div>
        <Button size="sm" variant="ghost" className="w-full justify-start" onClick={onClearChat} disabled={isBusy}>
          {isBusy ? 'Clearing…' : 'Clear current chat'}
        </Button>
      </div>
      <div className="flex-1 min-h-0">
        <AIChatHistory
          activeConversationId={activeThreadId ?? undefined}
          conversations={threads.map((thread) => ({
            id: thread.id,
            title: thread.title,
            lastMessage: thread.lastMessagePreview,
            lastMessageAt: thread.lastMessageAt ? new Date(thread.lastMessageAt) : undefined,
            messageCount: thread.messageCount,
            isArchived: thread.status === 'archived',
            isActive: thread.status === 'active',
          }))}
          onSelect={(conversationId) => onSelect(conversationId)}
          onRename={onRename}
          onDelete={onDelete}
          onArchive={onArchive}
          onUnarchive={onUnarchive}
          showNewButton={false}
        />
      </div>
    </aside>
  )
}
