'use client'

import { useCallback, useState, type DragEvent } from 'react'
import { cn } from '~/lib/utils'
import { filterAcceptedFiles } from '~/lib/fileFilters'
import { FileTrigger } from '~/components/ui/file-trigger'

interface SessionUploadDropzoneProps {
  acceptExtensions: string[]
  acceptedFileTypes: string[]
  statusLabel: string
  isPending?: boolean
  onFilesSelected: (files: File[]) => void
  onFolderSelected: (files: File[]) => void
  className?: string
}

export function SessionUploadDropzone({
  acceptExtensions,
  acceptedFileTypes,
  statusLabel,
  isPending = false,
  onFilesSelected,
  onFolderSelected,
  className,
}: SessionUploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      const files = filterAcceptedFiles(Array.from(event.dataTransfer.files ?? []), acceptExtensions)
      if (!files.length) return
      onFilesSelected(files)
    },
    [acceptExtensions, onFilesSelected],
  )

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node)) {
      return
    }
    setIsDragging(false)
  }, [])

  const handleSelectFiles = useCallback(
    (list?: FileList | null) => {
      if (!list) return
      const files = filterAcceptedFiles(Array.from(list), acceptExtensions)
      if (!files.length) return
      onFilesSelected(files)
    },
    [acceptExtensions, onFilesSelected],
  )

  const handleSelectFolder = useCallback(
    (list?: FileList | null) => {
      if (!list) return
      const files = filterAcceptedFiles(Array.from(list), acceptExtensions)
      if (!files.length) return
      onFolderSelected(files)
    },
    [acceptExtensions, onFolderSelected],
  )

  return (
    <div
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      className={cn(
        'group relative rounded-3xl border border-dashed border-border/70 bg-background/80 p-6 transition-colors',
        isDragging ? 'border-primary bg-primary/5' : '',
        className,
      )}
      data-testid="session-upload-dropzone"
      aria-busy={isPending}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">Upload & Stream</p>
        <span className="text-[11px] text-muted-foreground">{statusLabel}</span>
      </div>
      <h3 className="mt-2 text-lg font-semibold text-foreground">Drop session exports</h3>
      <p className="text-sm text-muted-foreground">
        Drag .jsonl/.ndjson files here or browse to ingest entire folders.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FileTrigger
          acceptExtensions={acceptExtensions}
          acceptedFileTypes={acceptedFileTypes}
          allowMultiple
          onSelect={handleSelectFiles}
          isPending={isPending}
          className="w-full justify-center"
          variant="default"
          size="sm"
        >
          {isPending ? 'Uploading…' : 'Upload files'}
        </FileTrigger>
        <FileTrigger
          acceptExtensions={acceptExtensions}
          acceptedFileTypes={acceptedFileTypes}
          allowMultiple
          acceptDirectory
          onSelect={handleSelectFolder}
          isPending={isPending}
          variant="outline"
          className="w-full justify-center"
          size="sm"
        >
          {isPending ? 'Scanning…' : 'Upload folder'}
        </FileTrigger>
      </div>
      <div className="pointer-events-none absolute inset-0 rounded-3xl border border-transparent transition-colors group-focus-visible:border-primary" />
    </div>
  )
}
