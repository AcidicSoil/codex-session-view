import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { TimelineWithFilters } from '~/components/viewer/TimelineWithFilters'
import type { TimelineEvent, TimelineFlagMarker } from '~/components/viewer/AnimatedTimelineList'
import { Button } from '~/components/ui/button'
import type { FileLoaderHook } from '~/hooks/useFileLoader'
import { persistSessionFile } from '~/server/function/sessionStore'
import { formatCount, formatDateTime } from '~/utils/intl'
import { toast } from 'sonner'
import { logDebug, logError, logInfo } from '~/lib/logger'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { uploadRecordToAsset } from '~/lib/viewerDiscovery'
import { cn } from '~/lib/utils'
import { SessionUploadDropzone } from '~/components/viewer/SessionUploadDropzone'
import { TimelineTracingBeam } from '~/components/viewer/TimelineTracingBeam'

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

interface UploadSectionProps {
  loader: FileLoaderHook
  onUploadsPersisted?: (assets: DiscoveredSessionAsset[]) => void
  onAddTimelineEventToChat?: (event: TimelineEvent, index: number) => void
  flaggedEvents?: Map<number, TimelineFlagMarker>
  onFlaggedEventClick?: (marker: TimelineFlagMarker) => void
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
  const acceptExtensions = useMemo(() => ['.jsonl', '.ndjson', '.txt'], [])
  const acceptedFileTypes = useMemo(() => Array.from(new Set([...acceptExtensions, 'application/x-ndjson'])), [acceptExtensions])

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      if (!files.length) return
      if (files.length === 1) {
        controller.handleFile(files[0])
      } else {
        controller.handleFolderSelection(files)
      }
    },
    [controller],
  )

  const handleFolderSelected = useCallback(
    (files: File[]) => {
      if (!files.length) return
      controller.handleFolderSelection(files)
    },
    [controller],
  )

  return (
    <div className={cn('rounded-2xl border bg-card/70 p-4 shadow-sm', className)}>
      <SessionUploadDropzone
        acceptExtensions={acceptExtensions}
        acceptedFileTypes={acceptedFileTypes}
        statusLabel={controller.dropZoneStatus}
        isPending={controller.dropZonePending}
        onFilesSelected={handleFilesSelected}
        onFolderSelected={handleFolderSelected}
        className="mt-4"
      />
      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Status</dt>
          <dd>{controller.dropZoneStatus}</dd>
        </div>
        {controller.meta?.timestamp ? (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Timestamp</dt>
            <dd>{formatDateTime(controller.meta.timestamp, { fallback: 'Unknown timestamp' })}</dd>
          </div>
        ) : null}
        {controller.meta?.git?.repo ? (
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Repo</dt>
            <dd>{controller.meta.git.repo}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  )
}

interface UploadTimelineSectionProps {
  controller: UploadController
  onAddTimelineEventToChat?: (event: TimelineEvent, index: number) => void
  className?: string
  onFiltersRender?: (node: ReactNode | null) => void
  flaggedEvents?: Map<number, import('~/components/viewer/AnimatedTimelineList').TimelineFlagMarker>
  onFlaggedEventClick?: (marker: import('~/components/viewer/AnimatedTimelineList').TimelineFlagMarker) => void
  focusEventIndex?: number | null
}

export function UploadTimelineSection({ controller, onAddTimelineEventToChat, className, onFiltersRender, flaggedEvents, onFlaggedEventClick, focusEventIndex }: UploadTimelineSectionProps) {
  const loader = controller.loader
  const hasEvents = loader.state.events.length > 0
  const [timelineHeight, setTimelineHeight] = useState(720)
  const [searchBarSlot, setSearchBarSlot] = useState<ReactNode | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const updateHeight = () => {
      const viewport = window.innerHeight || 0
      const nextHeight = clampNumber(viewport - 320, 480, 960)
      setTimelineHeight(nextHeight)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  return (
    <section className={cn('rounded-2xl border p-4', className)}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Timeline</p>
          <p className="text-xs text-muted-foreground">Animated list of parsed events.</p>
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
      {searchBarSlot ? <div className="mb-4">{searchBarSlot}</div> : null}
      {loader.state.phase === 'parsing' ? (
        <p className="text-sm text-muted-foreground">Streaming events… large sessions may take a moment.</p>
      ) : hasEvents ? (
        <TimelineTracingBeam className="mt-4">
          <TimelineWithFilters
            events={loader.state.events}
            onAddEventToChat={onAddTimelineEventToChat}
            timelineHeight={timelineHeight}
            registerFilters={onFiltersRender}
            registerSearchBar={setSearchBarSlot}
            flaggedEvents={flaggedEvents}
            onFlaggedEventClick={onFlaggedEventClick}
            focusEventIndex={focusEventIndex}
          />
        </TimelineTracingBeam>
      ) : (
        <p className="text-sm text-muted-foreground">Load a session to see its timeline here.</p>
      )}
    </section>
  )
}

export function UploadSection({ loader, onUploadsPersisted, onAddTimelineEventToChat, flaggedEvents, onFlaggedEventClick }: UploadSectionProps) {
  const controller = useUploadController({ loader, onUploadsPersisted })
  return (
    <section className="flex flex-col gap-6">
      <UploadControlsCard controller={controller} />
      <UploadTimelineSection
        controller={controller}
        onAddTimelineEventToChat={onAddTimelineEventToChat}
        flaggedEvents={flaggedEvents}
        onFlaggedEventClick={onFlaggedEventClick}
      />
    </section>
  )
}
