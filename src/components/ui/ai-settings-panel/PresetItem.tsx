import { useCallback, useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
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
import { cn } from '~/lib/utils'
import type { ChatAiSettingsPreset } from '~/lib/chatbot/aiSettings'

export interface PresetItemProps {
  preset: ChatAiSettingsPreset
  onLoad: (presetId: string) => void
  onDelete?: (presetId: string) => Promise<void>
  isFocused: boolean
  presetRef: (node: HTMLButtonElement | null) => void
}

export function PresetItem({ preset, onLoad, onDelete, isFocused, presetRef }: PresetItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!onDelete) return
      setShowDeleteDialog(true)
    },
    [onDelete],
  )

  const confirmDelete = useCallback(async () => {
    if (!onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(preset.id)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete preset:', error)
    } finally {
      setIsDeleting(false)
    }
  }, [onDelete, preset.id])

  return (
    <div role="listitem">
      <Badge
        aria-label={`Load preset ${preset.name}`}
        className={cn(
          'min-h-[44px] w-fit min-w-[44px] cursor-pointer gap-2 px-0.5 pl-3.5 sm:min-h-[32px] sm:min-w-[32px]',
          isFocused && 'ring-2 ring-ring ring-offset-2',
        )}
        onClick={() => onLoad(preset.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onLoad(preset.id)
          }
        }}
        ref={presetRef}
        role="button"
        tabIndex={0}
        variant="outline"
      >
        <span>{preset.name}</span>
        {onDelete && (
          <Button
            aria-label={`Delete preset ${preset.name}`}
            className="min-h-[44px] min-w-[44px] rounded-full sm:min-h-[32px] sm:min-w-[32px]"
            onClick={handleDelete}
            size="icon-sm"
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </Button>
        )}
      </Badge>
      <AlertDialog onOpenChange={setShowDeleteDialog} open={showDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete preset?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{preset.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20"
              disabled={isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PresetItem
