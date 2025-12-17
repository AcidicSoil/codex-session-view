import { MessageSquare, Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface EmptyStateProps {
  searchQuery: string
  showNewButton: boolean
  onNewConversation?: () => void
}

export function EmptyState({ searchQuery, showNewButton, onNewConversation }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <MessageSquare className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-medium text-sm">{searchQuery ? 'No conversations found' : 'No conversations'}</p>
        <p className="text-muted-foreground text-sm">
          {searchQuery ? 'Try a different search term' : 'Start a new conversation to get started'}
        </p>
      </div>
      {!searchQuery && showNewButton && onNewConversation ? (
        <Button className="min-h-[44px] sm:min-h-[24px]" onClick={onNewConversation} type="button" variant="outline">
          <Plus className="size-4" />
          New Conversation
        </Button>
      ) : null}
    </div>
  )
}

export default EmptyState
