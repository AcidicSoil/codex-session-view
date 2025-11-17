import { useMemo, useState } from 'react';
import type { SessionMetaParsed } from '~/lib/session-parser';
import { FileTrigger } from '~/components/ui/file-trigger';
import { cn } from '~/lib/utils';
import { formatDateTime } from '~/utils/intl';

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

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsHovering(false);
    const files = filterAcceptedFiles(Array.from(event.dataTransfer.files ?? []), acceptExtensions);
    if (files.length > 1 && onFilesSelected) {
      onFilesSelected(files);
    }
    const file = files[0];
    if (file) onFile(file);
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
        <FileTrigger
          acceptExtensions={acceptExtensions}
          acceptedFileTypes={acceptedFileTypes}
          allowMultiple
          acceptDirectory
          onFile={onFile}
          onSelect={(list) => {
            const files = filterAcceptedFiles(Array.from(list ?? []), acceptExtensions);
            if (files.length > 1 && onFilesSelected) {
              onFilesSelected(files);
            }
          }}
          size="sm"
          variant="default"
          isPending={isPending}
        >
          {isPending ? 'Uploading…' : 'Upload session'}
        </FileTrigger>
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
              <dd>{formatDateTime(meta.timestamp, 'Unknown timestamp')}</dd>
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

function pickFirst(files: File[], acceptExts: string[]) {
  const filtered = filterAcceptedFiles(files, acceptExts);
  return filtered[0] ?? null;
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
