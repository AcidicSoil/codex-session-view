import { useId, useMemo, useState } from 'react';
import { Card, CardContent } from '~/components/ui/card';
import { cn } from '~/lib/utils';

function pickFirst(files: FileList | null, acceptExts: string[]) {
  if (!files || files.length === 0) return null;
  const lowerExts = acceptExts.map((ext) => ext.toLowerCase());
  for (const file of Array.from(files)) {
    const name = file.name.toLowerCase();
    if (lowerExts.length === 0 || lowerExts.some((ext) => name.endsWith(ext))) {
      return file;
    }
  }
  return null;
}

export interface DropZoneProps {
  onFile: (file: File) => void;
  acceptExtensions?: string[];
  className?: string;
}

export function DropZone({
  onFile,
  className,
  acceptExtensions = ['.jsonl', '.ndjson', '.txt'],
}: DropZoneProps) {
  const [isHovering, setIsHovering] = useState(false);
  const inputId = useId();
  const acceptAttr = useMemo(
    () => [...acceptExtensions, 'application/x-ndjson'].join(','),
    [acceptExtensions]
  );

  const handleDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsHovering(false);
    const file = pickFirst(event.dataTransfer?.files ?? null, acceptExtensions);
    if (file) onFile(file);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = pickFirst(event.target.files, acceptExtensions);
    if (file) onFile(file);
    event.target.value = '';
  };

  return (
    <Card className={cn('overflow-hidden border-dashed', className)}>
      <CardContent className="p-0">
        <label
          htmlFor={inputId}
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
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
            isHovering ? 'border-primary bg-primary/5' : 'border-border bg-card'
          )}
        >
          <input
            id={inputId}
            type="file"
            accept={acceptAttr}
            className="sr-only"
            onChange={handleChange}
          />
          <span className="text-sm font-medium text-foreground">Drop a .jsonl/.ndjson file</span>
          <span className="text-xs text-muted-foreground">or click to choose from disk</span>
        </label>
      </CardContent>
    </Card>
  );
}
