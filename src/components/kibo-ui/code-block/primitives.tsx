"use client"

import { cloneElement, useState, type ComponentProps, type HTMLAttributes, type ReactElement, type ReactNode } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import type { IconType } from 'react-icons'
import { cn } from '~/lib/utils'
import { useCodeBlockContext, type CodeBlockData } from './context'
import { getFilenameIcon } from './icons'

export type CodeBlockHeaderProps = HTMLAttributes<HTMLDivElement>

export const CodeBlockHeader = ({ className, ...props }: CodeBlockHeaderProps) => (
  <div className={cn('flex flex-row items-center border-b bg-secondary p-1', className)} {...props} />
)

export type CodeBlockFilesProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  children: (item: CodeBlockData) => ReactNode
}

export const CodeBlockFiles = ({ className, children, ...props }: CodeBlockFilesProps) => {
  const { data } = useCodeBlockContext()
  return (
    <div className={cn('flex grow flex-row items-center gap-2', className)} {...props}>
      {data.map(children)}
    </div>
  )
}

export type CodeBlockFilenameProps = HTMLAttributes<HTMLDivElement> & {
  icon?: IconType
  value?: string
}

export const CodeBlockFilename = ({ className, icon, value, children, ...props }: CodeBlockFilenameProps) => {
  const { value: activeValue } = useCodeBlockContext()
  const resolvedIcon = icon ?? getFilenameIcon(children as string)

  if (value !== activeValue) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2 bg-secondary px-4 py-1.5 text-muted-foreground text-xs', className)} {...props}>
      {resolvedIcon ? <resolvedIcon className="h-4 w-4 shrink-0" /> : null}
      <span className="flex-1 truncate">{children}</span>
    </div>
  )
}

export type CodeBlockSelectProps = ComponentProps<typeof Select>

export const CodeBlockSelect = (props: CodeBlockSelectProps) => {
  const { value, onValueChange } = useCodeBlockContext()
  return <Select onValueChange={onValueChange} value={value} {...props} />
}

export type CodeBlockSelectTriggerProps = ComponentProps<typeof SelectTrigger>

export const CodeBlockSelectTrigger = ({ className, ...props }: CodeBlockSelectTriggerProps) => (
  <SelectTrigger className={cn('w-fit border-none text-muted-foreground text-xs shadow-none', className)} {...props} />
)

export const CodeBlockSelectValue = (props: ComponentProps<typeof SelectValue>) => <SelectValue {...props} />

export type CodeBlockSelectContentProps = Omit<ComponentProps<typeof SelectContent>, 'children'> & {
  children: (item: CodeBlockData) => ReactNode
}

export const CodeBlockSelectContent = ({ children, ...props }: CodeBlockSelectContentProps) => {
  const { data } = useCodeBlockContext()
  return <SelectContent {...props}>{data.map(children)}</SelectContent>
}

export const CodeBlockSelectItem = ({ className, ...props }: ComponentProps<typeof SelectItem>) => (
  <SelectItem className={cn('text-sm', className)} {...props} />
)

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void
  onError?: (error: Error) => void
  timeout?: number
}

export const CodeBlockCopyButton = ({ asChild, onCopy, onError, timeout = 2000, children, className, ...props }: CodeBlockCopyButtonProps) => {
  const [isCopied, setIsCopied] = useState(false)
  const { data, value } = useCodeBlockContext()
  const code = data.find((item) => item.language === value)?.code

  const copyToClipboard = () => {
    if (typeof window === 'undefined' || !navigator.clipboard.writeText || !code) return

    navigator.clipboard.writeText(code).then(() => {
      setIsCopied(true)
      onCopy?.()
      setTimeout(() => setIsCopied(false), timeout)
    }, onError)
  }

  if (asChild) {
    return cloneElement(children as ReactElement, {
      onClick: copyToClipboard,
    })
  }

  const Icon = isCopied ? CheckIcon : CopyIcon

  return (
    <Button className={cn('shrink-0', className)} onClick={copyToClipboard} size="icon" variant="ghost" {...props}>
      {children ?? <Icon className="text-muted-foreground" size={14} />}
    </Button>
  )
}
