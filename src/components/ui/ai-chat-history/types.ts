export interface Conversation {
  id: string
  title: string
  lastMessage?: string
  lastMessageAt?: Date
  messageCount?: number
  isArchived?: boolean
  isActive?: boolean
}

export interface AIChatHistoryProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelect?: (conversationId: string) => void
  onNewConversation?: () => void
  onRename?: (conversationId: string, newTitle: string) => Promise<void>
  onDelete?: (conversationId: string) => Promise<void>
  onArchive?: (conversationId: string) => Promise<void>
  onUnarchive?: (conversationId: string) => Promise<void>
  className?: string
  showSearch?: boolean
  showNewButton?: boolean
}
