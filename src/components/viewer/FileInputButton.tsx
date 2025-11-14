import { useRef } from 'react';
import { Button } from '~/components/ui/button';

interface FileInputButtonProps {
  onFile: (file: File) => void;
  accept?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function FileInputButton({
  onFile,
  accept = '.jsonl,.ndjson,.txt',
  label = 'Choose session file',
  disabled,
  className,
}: FileInputButtonProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const trigger = () => inputRef.current?.click();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-hidden
      />
      <Button type="button" onClick={trigger} disabled={disabled} className={className}>
        {label}
      </Button>
    </>
  );
}
