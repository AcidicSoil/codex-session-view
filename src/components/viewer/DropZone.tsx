import { useCallback, useMemo, useState } from 'react';
import type { SessionMetaParsed } from '~/lib/session-parser';
import { FileTrigger } from '~/components/ui/file-trigger';
import { cn } from '~/lib/utils';
import { formatDateTime } from '~/utils/intl';
import { logInfo } from '~/lib/logger';

export interface DropZoneProps {
  onFile: (file: File) => void;
  onFilesSelected?: (files: File[]) => void;
  acceptExtensions?: string[];
  className?: string;
  isPending?: boolean;
  statusLabel?: string;
  meta?: SessionMetaParsed;
}

const MIME_FALLBACK = 'application/x-ndjson';

export function DropZone({
  onFile,
  onFilesSelected,
  className,
  acceptExtensions = ['.jsonl', '.ndjson', '.txt'],
  isPending = false,
  statusLabel,
  meta,
}: DropZoneProps) {
  const [isHovering, setIsHovering] = useState(false);
  const acceptedFileTypes = useMemo(
    () => Array.from(new Set([...acceptExtensions, MIME_FALLBACK])),
    [acceptExtensions]
  );
  const handleSingleFileSelection = useCallback(
    (file?: File) => {
      if (!file) return;
      logInfo('dropzone', 'Single file selected', { name: file.name });
      onFile(file);
    },
    [onFile]
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsHovering(false);
    const files = filterAcceptedFiles(Array.from(event.dataTransfer.files ?? []), acceptExtensions);
    if (files.length > 1 && onFilesSelected) {
      logInfo('dropzone', 'Multiple files dropped', { count: files.length });
      onFilesSelected(files);
    }
    const file = files[0];
    if (file) {
      logInfo('dropzone', 'Drop accepted', { name: file.name });
      onFile(file);
    }
  };

  return (
    <div className={cn('w-full max-w-xl rounded-xl border bg-card/70 p-5', className)}>
      <div
        className={cn(
          'space-y-4 rounded-lg border-2 border-dashed px-5 py-6 transition',
          isHovering ? 'border-primary bg-primary/5' : 'border-border'
        )}
        onDragOver={(event) => {
          event.preventDefault();
          setIsHovering(true);
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsHovering(true);
        }}
        onDragLeave={() => setIsHovering(false)}
        onDrop={handleDrop}
      >
        <div>
          <p className="text-sm font-semibold">Upload session log</p>
          <p className="text-xs text-muted-foreground">Select or drop a .jsonl/.ndjson transcript.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <FileTrigger
            acceptExtensions={acceptExtensions}
            acceptedFileTypes={acceptedFileTypes}
            allowMultiple
            onSelect={(list) => {
              if (!list) return;
              const files = filterAcceptedFiles(Array.from(list), acceptExtensions);
              if (!files.length) return;
              if (files.length === 1) {
                handleSingleFileSelection(files[0]);
              } else {
                logInfo('dropzone', 'Multiple files selected via picker', { count: files.length });
                onFilesSelected?.(files);
              }
            }}
            size="sm"
            variant="default"
            isPending={isPending}
          >
            {isPending ? 'Uploading…' : 'Upload files'}
          </FileTrigger>
          <FileTrigger
            acceptExtensions={acceptExtensions}
            acceptedFileTypes={acceptedFileTypes}
            allowMultiple
            acceptDirectory
            onSelect={(list) => {
              const files = filterAcceptedFiles(Array.from(list ?? []), acceptExtensions);
              if (files.length) {
                logInfo('dropzone', 'Folder upload selected', { count: files.length });
                onFilesSelected?.(files);
              }
            }}
            size="sm"
            variant="outline"
            isPending={isPending}
          >
            {isPending ? 'Scanning…' : 'Upload folder'}
          </FileTrigger>
        </div>
        <p className="text-xs text-muted-foreground">Supports .jsonl, .ndjson, or .txt exports.</p>
      </div>

      {statusLabel ? (
        <dl className="mt-4 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">Status</dt>
            <dd>{statusLabel}</dd>
          </div>
          {meta?.timestamp ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Timestamp</dt>
              <dd>{formatDateTime(meta.timestamp, { fallback: 'Unknown timestamp' })}</dd>
            </div>
          ) : null}
          {meta?.git?.repo ? (
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Repo</dt>
              <dd>{meta.git.repo}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

function filterAcceptedFiles(files: File[], acceptExts: string[]) {
  if (!files.length) return [];
  if (!acceptExts.length) return files;
  const lowerExts = acceptExts.map((ext) => ext.toLowerCase());
  return files.filter((file) => {
    const name = file.name.toLowerCase();
    return lowerExts.some((ext) => name.endsWith(ext));
  });
}
