import { Plus } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { CardDescription, CardTitle } from '~/components/ui/card'

interface ConversationHeaderProps {
  conversationsCount: number
  showNewButton: boolean
  onNewConversation?: () => void
}

export function ConversationHeader({ conversationsCount, showNewButton, onNewConversation }: ConversationHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <CardTitle>Conversations</CardTitle>
          <CardDescription>
            {conversationsCount} conversation{conversationsCount !== 1 ? 's' : ''}
          </CardDescription>
        </div>
        {showNewButton && onNewConversation ? (
          <Button className="min-h-[44px] w-full shrink-0 sm:min-h-[24px]" onClick={onNewConversation} type="button">
            <Plus className="size-4" />
            <span className="whitespace-nowrap">New Chat</span>
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export default ConversationHeader
