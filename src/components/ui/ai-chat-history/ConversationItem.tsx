import { useCallback, useEffect, useRef, useState } from 'react'
import { Archive, Loader2, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '~/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import type { Conversation } from './types'
import { formatDate } from './utils'

export interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  isEditing: boolean
  editValue: string
  onSelect: () => void
  onRenameStart: () => void
  onRenameSubmit: () => void
  onRenameCancel: () => void
  onEditValueChange: (value: string) => void
  onRename?: (conversationId: string, newTitle: string) => Promise<void>
  onDelete?: (conversationId: string) => Promise<void>
  onArchive?: (conversationId: string) => Promise<void>
  onUnarchive?: (conversationId: string) => Promise<void>
  isLoading?: boolean
}

export function ConversationItem({
  conversation,
  isActive,
  isEditing,
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
  isLoading = false,
}: ConversationItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleDelete = useCallback(async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(conversation.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    } finally {
      setIsDeleting(false)
    }
  }, [conversation.id, onDelete])

  return (
    <>
      <div
        className={cn(
          'group relative flex flex-col gap-2 rounded-lg border p-3 transition-colors',
          'min-h-[60px] touch-manipulation [-webkit-tap-highlight-color:transparent]',
          isActive
            ? 'border-primary bg-primary/5 shadow-xs'
            : 'border-transparent bg-card focus-within:border-border focus-within:bg-muted/50 hover:border-border hover:bg-muted/50',
          isLoading && 'pointer-events-none opacity-50',
        )}
        role="listitem"
      >
        <div className="flex items-start gap-3">
          <button
            aria-label={`Select conversation ${conversation.title}`}
            className="flex min-h-[44px] min-w-0 flex-1 flex-col gap-1 rounded-sm text-left [-webkit-tap-highlight-color:transparent] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[24px]"
            disabled={isLoading}
            onClick={onSelect}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect()
              }
            }}
            type="button"
          >
            {isEditing ? (
              <input
                aria-label="Edit conversation title"
                className="min-h-[44px] w/full rounded-md border bg-background px-2 py-1.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 sm:min-h-[24px] sm:text-sm"
                onBlur={onRenameSubmit}
                onChange={(e) => onEditValueChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    onRenameSubmit()
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    onRenameCancel()
                  }
                }}
                ref={inputRef}
                value={editValue}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="wrap-break-word min-w-0 font-medium text-sm">{conversation.title}</h4>
                </div>
                {conversation.lastMessage ? (
                  <p className="wrap-break-word line-clamp-2 min-w-0 text-muted-foreground text-xs">
                    {conversation.lastMessage}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                  {conversation.lastMessageAt ? (
                    <span className="whitespace-nowrap tabular-nums">{formatDate(conversation.lastMessageAt)}</span>
                  ) : null}
                  {conversation.messageCount !== undefined ? (
                    <>
                      <span aria-hidden="true" className="shrink-0">
                        •
                      </span>
                      <span className="whitespace-nowrap tabular-nums">
                        {conversation.messageCount} message{conversation.messageCount !== 1 ? 's' : ''}
                      </span>
                    </>
                  ) : null}
                </div>
              </>
            )}
          </button>
          {!isEditing ? (
            <div className="absolute top-2 right-2 z-10">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    aria-label={`More options for ${conversation.title}`}
                    className="min-h-[44px] min-w-[44px] shrink-0 opacity-0 transition-opacity [-webkit-tap-highlight-color:transparent] focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 sm:min-h-[24px] sm:min-w-[24px]"
                    disabled={isLoading}
                    size="icon"
                    type="button"
                    variant="ghost"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onRename ? (
                    <DropdownMenuItem disabled={isLoading} onClick={onRenameStart}>
                      <Pencil className="size-4" />
                      Rename
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  {conversation.isArchived
                    ? onUnarchive && (
                        <DropdownMenuItem disabled={isLoading} onClick={() => onUnarchive(conversation.id)}>
                          <Archive className="size-4" />
                          Unarchive
                        </DropdownMenuItem>
                      )
                    : onArchive && (
                        <DropdownMenuItem disabled={isLoading} onClick={() => onArchive(conversation.id)}>
                          <Archive className="size-4" />
                          Archive
                        </DropdownMenuItem>
                      )}
                  {onDelete ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem disabled={isLoading} onClick={() => setShowDeleteDialog(true)} variant="destructive">
                        <Trash2 className="size-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : null}
        </div>
      </div>

      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{conversation.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default ConversationItem
