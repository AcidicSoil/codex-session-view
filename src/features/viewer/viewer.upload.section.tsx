import { useCallback, useState } from 'react'
import { DropZone } from '~/components/viewer/DropZone'
import { TimelineWithFilters } from '~/components/viewer/TimelineWithFilters'
import { Switch } from '~/components/ui/switch'
import { Button } from '~/components/ui/button'
import type { FileLoaderHook } from '~/hooks/useFileLoader'
import { persistSessionFile } from '~/server/function/sessionStore'
import { formatCount } from '~/utils/intl'
import { toast } from 'sonner'
import { logDebug, logError, logInfo } from '~/lib/logger'
import type { DiscoveredSessionAsset } from '~/lib/viewerDiscovery'
import { uploadRecordToAsset } from '~/lib/viewerDiscovery'

interface UploadSectionProps {
  loader: FileLoaderHook
  onUploadsPersisted?: (assets: DiscoveredSessionAsset[]) => void
}

export function UploadSection({ loader, onUploadsPersisted }: UploadSectionProps) {
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

  const meta = loader.state.meta
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

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Switch
              id="persist-toggle"
              checked={loader.persist}
              onCheckedChange={(value) => {
                logInfo('viewer.persist', `Toggled persist to ${value}`)
                loader.setPersist(value)
              }}
            />
            <label htmlFor="persist-toggle">Persist session</label>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (isEjecting) return
              setIsEjecting(true)
              logInfo('viewer.session', 'Ejecting current session')
              loader.reset()
              toast.success('Session cleared')
              setTimeout(() => setIsEjecting(false), 150)
            }}
            disabled={!hasEvents || isEjecting}
          >
            {isEjecting ? 'Ejecting…' : 'Eject session'}
          </Button>
        </div>
        <div className="flex justify-start">
          <DropZone
            onFile={handleFile}
            onFilesSelected={handleFolderSelection}
            acceptExtensions={['.jsonl', '.ndjson', '.txt']}
            isPending={dropZonePending}
            statusLabel={dropZoneStatus}
            meta={meta}
          />
        </div>
      </div>

      <div className="rounded-2xl border p-4">
        <div className="mb-4">
          <p className="text-sm font-semibold">Timeline</p>
          <p className="text-xs text-muted-foreground">Animated list of parsed events.</p>
        </div>
        {loader.state.phase === 'parsing' ? (
          <p className="text-sm text-muted-foreground">Streaming events… large sessions may take a moment.</p>
        ) : hasEvents ? (
          <TimelineWithFilters events={loader.state.events} />
        ) : (
          <p className="text-sm text-muted-foreground">Load a session to see its timeline here.</p>
        )}
      </div>
    </section>
  )
}
