import type { Conversation } from './types'
import ConversationItem from './ConversationItem'

export interface ConversationGroupProps {
  label: string
  conversations: Conversation[]
  activeConversationId?: string
  editingId: string | null
  editValue: string
  onSelect: (conversationId: string) => void
  onRenameStart: (conversation: Conversation) => void
  onRenameSubmit: (conversationId: string) => void
  onRenameCancel: () => void
  onEditValueChange: (value: string) => void
  onRename?: (conversationId: string, newTitle: string) => Promise<void>
  onDelete?: (conversationId: string) => Promise<void>
  onArchive?: (conversationId: string) => Promise<void>
  onUnarchive?: (conversationId: string) => Promise<void>
  isLoading?: Record<string, boolean>
}

export function ConversationGroup({
  label,
  conversations,
  activeConversationId,
  editingId,
  editValue,
  onSelect,
  onRenameStart,
  onRenameSubmit,
  onRenameCancel,
  onEditValueChange,
  onRename,
  onDelete,
  onArchive,
  onUnarchive,
  isLoading = {},
}: ConversationGroupProps) {
  return (
    <div>
      <div className="sticky top-0 z-10 bg-card pb-2">
        <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">{label}</h3>
      </div>
      <div className="flex flex-col gap-1" role="list">
        {conversations.map((conversation) => {
          const isActive = conversation.id === activeConversationId
          const isEditing = editingId === conversation.id

          return (
            <ConversationItem
              conversation={conversation}
              editValue={editValue}
              isActive={isActive}
              isEditing={isEditing}
              isLoading={isLoading[conversation.id]}
              key={conversation.id}
              onArchive={onArchive}
              onDelete={onDelete}
              onEditValueChange={onEditValueChange}
              onRename={onRename}
              onRenameCancel={onRenameCancel}
              onRenameStart={() => onRenameStart(conversation)}
              onRenameSubmit={() => onRenameSubmit(conversation.id)}
              onSelect={() => onSelect(conversation.id)}
              onUnarchive={onUnarchive}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ConversationGroup
