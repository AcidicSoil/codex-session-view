import * as SheetPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '~/lib/utils'

export const Sheet = SheetPrimitive.Root

export const SheetTrigger = SheetPrimitive.Trigger

export const SheetClose = SheetPrimitive.Close

export const SheetPortal = SheetPrimitive.Portal

export const SheetOverlay = ({ className, ...props }: SheetPrimitive.DialogOverlayProps) => (
  <SheetPrimitive.Overlay
    className={cn('fixed inset-0 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in', className)}
    {...props}
  />
)
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

export interface SheetContentProps extends SheetPrimitive.DialogContentProps {
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export const SheetContent = ({ side = 'right', className, children, ...props }: SheetContentProps) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      className={cn(
        'fixed z-50 flex flex-col gap-4 overflow-y-auto bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:duration-300 data-[state=open]:duration-500',
        side === 'right' && 'inset-y-0 right-0 h-full w-full border-l border-border sm:max-w-md',
        side === 'left' && 'inset-y-0 left-0 h-full w-full border-r border-border sm:max-w-md',
        side === 'top' && 'inset-x-0 top-0 w-full border-b border-border',
        side === 'bottom' && 'inset-x-0 bottom-0 w-full border-t border-border',
        className,
      )}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
)
SheetContent.displayName = SheetPrimitive.Content.displayName

export const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('space-y-1.5', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

export const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
SheetFooter.displayName = 'SheetFooter'

export const SheetTitle = ({ className, ...props }: SheetPrimitive.DialogTitleProps) => (
  <SheetPrimitive.Title className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
)
SheetTitle.displayName = SheetPrimitive.Title.displayName

export const SheetDescription = ({ className, ...props }: SheetPrimitive.DialogDescriptionProps) => (
  <SheetPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />
)
SheetDescription.displayName = SheetPrimitive.Description.displayName
