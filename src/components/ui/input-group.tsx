import type { ReactNode } from 'react'
import { cn } from '~/lib/utils'

export function InputGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex items-stretch rounded-md border border-input bg-background shadow-sm', className)}>{children}</div>
}

export function InputGroupText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('flex items-center px-3 text-muted-foreground', className)}>{children}</span>
}

