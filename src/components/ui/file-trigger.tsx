import { useMemo, useRef } from 'react'
import { Loader2, Paperclip, Upload } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'

export interface FileTriggerProps {
  acceptExtensions?: string[]
  acceptedFileTypes?: string[]
  allowMultiple?: boolean
  acceptDirectory?: boolean
  defaultCamera?: boolean
  onFile?: (file: File) => void
  onSelect?: (files: FileList | null) => void
  isPending?: boolean
  isDisabled?: boolean
  className?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  children?: React.ReactNode
  inputTestId?: string
}

export function FileTrigger({
  acceptExtensions,
  acceptedFileTypes,
  allowMultiple,
  acceptDirectory,
  onFile,
  onSelect,
  isPending = false,
  isDisabled = false,
  className,
  variant = 'outline',
  size = 'default',
  children,
  inputTestId,
}: FileTriggerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const acceptAttr = useMemo(() => {
    const extensions = acceptExtensions?.length ? acceptExtensions : []
    const explicit = acceptedFileTypes?.length ? acceptedFileTypes : []
    if (!extensions.length && !explicit.length) return undefined
    return [...explicit, ...extensions].join(',')
  }, [acceptExtensions, acceptedFileTypes])

  const handleClick = () => {
    if (isPending || isDisabled) return
    inputRef.current?.click()
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    onSelect?.(files ?? null)
    if (files && files.length && onFile) {
      const file = pickFirstMatchingFile(Array.from(files), acceptExtensions)
      if (file) onFile(file)
    }
    event.target.value = ''
  }

  const icon = isPending ? (
    <Loader2 className="size-4 animate-spin" />
  ) : children ? (
    <Upload className="size-4" />
  ) : (
    <Paperclip className="size-4" />
  )

  const label =
    typeof children === 'string'
      ? children
      : allowMultiple
        ? 'Select files'
        : 'Select file'

  return (
    <div className="inline-flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple={allowMultiple || acceptDirectory}
        onChange={handleChange}
        className="hidden"
        data-testid={inputTestId}
        {...(acceptDirectory
          ? {
              webkitdirectory: '' as any,
              directory: '' as any,
              mozdirectory: '' as any,
            }
          : {})}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={isPending || isDisabled}
        className={cn('gap-2', className)}
      >
        {icon}
        <span>{label}</span>
      </Button>
    </div>
  )
}

function pickFirstMatchingFile(files: File[], extensions?: string[]) {
  if (!files.length) return null
  if (!extensions || !extensions.length) return files[0]
  const normalized = extensions.map((ext) => ext.toLowerCase())
  for (const file of files) {
    const name = file.name.toLowerCase()
    if (normalized.some((ext) => name.endsWith(ext))) {
      return file
    }
  }
  return files[0]
}
