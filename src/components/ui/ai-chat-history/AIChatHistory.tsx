'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader } from '~/components/ui/card'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'
import { groupConversationsByDate } from './utils'
import type { AIChatHistoryProps, Conversation } from './types'
import { ConversationHeader } from './ConversationHeader'
import { ConversationSearch } from './ConversationSearch'
import { EmptyState } from './EmptyState'
import { ConversationGroup } from './ConversationGroup'

export default function AIChatHistory({
  conversations,
  activeConversationId,
  onSelect,
  onNewConversation,
  onRename,
  onDelete,
  onArchive,
  onUnarchive,
  className,
  showSearch = true,
  showNewButton = true,
}: AIChatHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({})
  const containerRef = useRef<HTMLDivElement>(null)

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations

    const query = searchQuery.toLowerCase().trim()
    return conversations.filter(
      (conv) => conv.title.toLowerCase().includes(query) || conv.lastMessage?.toLowerCase().includes(query),
    )
  }, [conversations, searchQuery])

  const groupedConversations = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations],
  )

  const handleRenameStart = useCallback((conversation: Conversation) => {
    setEditingId(conversation.id)
    setEditValue(conversation.title)
  }, [])

  const handleRenameSubmit = useCallback(
    async (conversationId: string) => {
      if (!(onRename && editValue.trim())) {
        setEditingId(null)
        return
      }

      const trimmedValue = editValue.trim()
      if (trimmedValue === conversations.find((c) => c.id === conversationId)?.title) {
        setEditingId(null)
        return
      }

      setLoadingStates((prev) => ({ ...prev, [conversationId]: true }))
      try {
        await onRename(conversationId, trimmedValue)
        setEditingId(null)
      } catch (error) {
        console.error('Failed to rename conversation:', error)
      } finally {
        setLoadingStates((prev) => {
          const next = { ...prev }
          delete next[conversationId]
          return next
        })
      }
    },
    [onRename, editValue, conversations],
  )

  const handleRenameCancel = useCallback(() => {
    setEditingId(null)
    setEditValue('')
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const items = containerRef.current?.querySelectorAll<HTMLElement>('[role="listitem"] button')
        if (!items || items.length === 0) return

        const currentIndex = Array.from(items).findIndex((item) => item === document.activeElement)
        const nextIndex =
          e.key === 'ArrowDown'
            ? (currentIndex + 1) % items.length
            : currentIndex === -1
              ? items.length - 1
              : (currentIndex - 1 + items.length) % items.length

        items[nextIndex]?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Card className={cn('flex h-fit w-full max-w-sm flex-col shadow-xs', className)}>
      <CardHeader className="shrink-0">
        <div className="flex flex-col gap-4">
          <ConversationHeader
            conversationsCount={conversations.length}
            onNewConversation={onNewConversation}
            showNewButton={showNewButton}
          />
          {showSearch ? <ConversationSearch onChange={setSearchQuery} value={searchQuery} /> : null}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overscroll-contain" ref={containerRef}>
        {filteredConversations.length === 0 ? (
          <EmptyState onNewConversation={onNewConversation} searchQuery={searchQuery} showNewButton={showNewButton} />
        ) : (
          <div className="flex flex-col gap-4">
            {groupedConversations.map((group, index) => (
              <div key={`${group.label}-${index}`}>
                <ConversationGroup
                  activeConversationId={activeConversationId}
                  conversations={group.conversations}
                  editingId={editingId}
                  editValue={editValue}
                  isLoading={loadingStates}
                  label={group.label}
                  onArchive={onArchive}
                  onDelete={onDelete}
                  onEditValueChange={setEditValue}
                  onRename={onRename}
                  onRenameCancel={handleRenameCancel}
                  onRenameStart={handleRenameStart}
                  onRenameSubmit={handleRenameSubmit}
                  onSelect={onSelect ?? (() => {})}
                  onUnarchive={onUnarchive}
                />
                {index < groupedConversations.length - 1 ? <Separator className="my-4" /> : null}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
