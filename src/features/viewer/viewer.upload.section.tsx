import { useCallback, useState } from 'react'
import { DropZone } from '~/components/viewer/DropZone'
import { TimelineWithFilters } from '~/components/viewer/TimelineWithFilters'
import type { TimelineEvent } from '~/components/viewer/AnimatedTimelineList'
import { Switch } from '~/components/ui/switch'
import { Button } from '~/components/ui/button'
import type { FileLoaderHook } from '~/hooks/useFileLoader'
import { persistSessionFile } from '~/server/function/sessionStore'
import { formatCount } from '~/utils/intl'
import { toast } from 'sonner'
import { logDebug, logError, logInfo } from '~/lib/logger'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { uploadRecordToAsset } from '~/lib/viewerDiscovery'
import { cn } from '~/lib/utils'

interface UploadSectionProps {
  loader: FileLoaderHook
  onUploadsPersisted?: (assets: DiscoveredSessionAsset[]) => void
  onAddTimelineEventToChat?: (event: TimelineEvent, index: number) => void
}

interface UploadControllerOptions {
  loader: FileLoaderHook
  onUploadsPersisted?: (assets: DiscoveredSessionAsset[]) => void
}

export type UploadController = ReturnType<typeof useUploadController>

export function useUploadController({ loader, onUploadsPersisted }: UploadControllerOptions) {
  const [isEjecting, setIsEjecting] = useState(false)
  const [isPersistingUpload, setIsPersistingUpload] = useState(false)

  const persistUploads = useCallback(
    async (files: File[]) => {
      if (!files.length) return
      setIsPersistingUpload(true)
      logInfo('viewer.upload', 'Persisting uploads', { count: files.length })
      try {
        const appendedAssets: DiscoveredSessionAsset[] = []
        for (const file of files) {
          const content = await file.text()
          const summary = await persistSessionFile({ data: { filename: file.name, content } })
          const asset = uploadRecordToAsset(summary)
          appendedAssets.push(asset)
          logDebug('viewer.upload', 'Persisted session file', { name: file.name, repo: asset.repoMeta?.repo })
        }
        if (appendedAssets.length) {
          onUploadsPersisted?.(appendedAssets)
        }
        toast.success(
          files.length > 1
            ? `${formatCount(files.length)} sessions cached to ~/.codex/sessions`
            : 'Session cached to ~/.codex/sessions',
        )
        logInfo('viewer.upload', 'Persisted uploads successfully')
      } catch (error) {
        logError('viewer.upload', 'Failed to persist uploads', error as Error)
        toast.error('Failed to cache session', {
          description: error instanceof Error ? error.message : 'Unknown error',
        })
      } finally {
        setIsPersistingUpload(false)
      }
    },
    [onUploadsPersisted],
  )

  const handleFile = useCallback(
    (file: File) => {
      logInfo('viewer.dropzone', 'File selected', { name: file.name })
      loader.start(file)
      void persistUploads([file])
    },
    [loader, persistUploads],
  )

  const handleFolderSelection = useCallback(
    (files: File[]) => {
      if (!files.length) return
      logInfo('viewer.dropzone', 'Folder selection received', { count: files.length })
      void persistUploads(files)
    },
    [persistUploads],
  )

  const progressLabel =
    loader.state.phase === 'parsing'
      ? `Parsing… (${formatCount(loader.progress.ok)} ok / ${formatCount(loader.progress.fail)} errors)`
      : loader.state.phase === 'success'
        ? `Loaded ${formatCount(loader.state.events.length)} events`
        : loader.state.phase === 'error' && loader.progress.fail > 0
          ? `Finished with ${formatCount(loader.progress.fail)} errors`
          : 'Idle'
  const dropZonePending = loader.state.phase === 'parsing' || isPersistingUpload
  const dropZoneStatus = isPersistingUpload ? 'Caching session to ~/.codex/sessions…' : progressLabel
  const hasEvents = loader.state.events.length > 0

  const ejectSession = useCallback(() => {
    if (isEjecting) return
    setIsEjecting(true)
    logInfo('viewer.session', 'Ejecting current session')
    loader.reset()
    toast.success('Session cleared')
    setTimeout(() => setIsEjecting(false), 150)
  }, [isEjecting, loader])

  const setPersist = useCallback(
    (value: boolean) => {
      logInfo('viewer.persist', `Toggled persist to ${value}`)
      loader.setPersist(value)
    },
    [loader],
  )

  return {
    loader,
    meta: loader.state.meta,
    handleFile,
    handleFolderSelection,
    dropZonePending,
    dropZoneStatus,
    hasEvents,
    isEjecting,
    persistEnabled: loader.persist,
    setPersist,
    ejectSession,
  }
}

interface UploadControlsCardProps {
  controller: UploadController
  className?: string
}

export function UploadControlsCard({ controller, className }: UploadControlsCardProps) {
  return (
    <div className={cn('rounded-2xl border bg-card/70 p-4 shadow-sm', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Switch id="persist-toggle" checked={controller.persistEnabled} onCheckedChange={controller.setPersist} />
          <label htmlFor="persist-toggle" className="font-medium">
            Persist session
          </label>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={controller.ejectSession}
          disabled={!controller.hasEvents || controller.isEjecting}
        >
          {controller.isEjecting ? 'Ejecting…' : 'Eject session'}
        </Button>
      </div>
      <DropZone
        className="mt-4 w-full max-w-full"
        onFile={controller.handleFile}
        onFilesSelected={controller.handleFolderSelection}
        acceptExtensions={['.jsonl', '.ndjson', '.txt']}
        isPending={controller.dropZonePending}
        statusLabel={controller.dropZoneStatus}
        meta={controller.meta}
        variant="compact"
      />
    </div>
  )
}

interface UploadTimelineSectionProps {
  controller: UploadController
  onAddTimelineEventToChat?: (event: TimelineEvent, index: number) => void
  className?: string
}

export function UploadTimelineSection({ controller, onAddTimelineEventToChat, className }: UploadTimelineSectionProps) {
  const loader = controller.loader
  const hasEvents = loader.state.events.length > 0

  return (
    <section className={cn('rounded-2xl border p-4', className)}>
      <div className="mb-4">
        <p className="text-sm font-semibold">Timeline</p>
        <p className="text-xs text-muted-foreground">Animated list of parsed events.</p>
      </div>
      {loader.state.phase === 'parsing' ? (
        <p className="text-sm text-muted-foreground">Streaming events… large sessions may take a moment.</p>
      ) : hasEvents ? (
        <TimelineWithFilters events={loader.state.events} onAddEventToChat={onAddTimelineEventToChat} />
      ) : (
        <p className="text-sm text-muted-foreground">Load a session to see its timeline here.</p>
      )}
    </section>
  )
}

export function UploadSection({ loader, onUploadsPersisted, onAddTimelineEventToChat }: UploadSectionProps) {
  const controller = useUploadController({ loader, onUploadsPersisted })
  return (
    <section className="flex flex-col gap-6">
      <UploadControlsCard controller={controller} />
      <UploadTimelineSection controller={controller} onAddTimelineEventToChat={onAddTimelineEventToChat} />
    </section>
  )
}
