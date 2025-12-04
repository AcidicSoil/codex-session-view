import { Bookmark, BookmarkCheck } from 'lucide-react'
import type { BookmarkType } from '~/stores/uiSettingsStore'
import { useUiSettingsStore } from '~/stores/uiSettingsStore'
import { cn } from '~/lib/utils'

interface BookmarkToggleProps {
  type: BookmarkType
  entityId: string
  label?: string
  className?: string
}

export function BookmarkToggle({ type, entityId, label, className }: BookmarkToggleProps) {
  const bookmarks = useUiSettingsStore((state) => state.bookmarks)
  const toggleBookmark = useUiSettingsStore((state) => state.toggleBookmark)
  const isActive = bookmarks.some((entry) => entry.type === type && entry.entityId === entityId)
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={() => toggleBookmark({ type, entityId, label })}
      className={cn(
        'inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2 text-white/70 transition hover:text-white',
        isActive && 'border-lime-400/60 text-lime-200',
        className,
      )}
    >
      {isActive ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
    </button>
  )
}
