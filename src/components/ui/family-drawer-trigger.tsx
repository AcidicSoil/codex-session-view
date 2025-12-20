import { Slot } from "@radix-ui/react-slot"
import clsx from "clsx"
import type { ReactNode } from "react"
import { Drawer } from "vaul"

interface FamilyDrawerTriggerProps {
  children: ReactNode
  asChild?: boolean
  className?: string
}

export function FamilyDrawerTrigger({
  children,
  asChild = false,
  className,
}: FamilyDrawerTriggerProps) {
  if (asChild) {
    return (
      <Drawer.Trigger asChild>
        <Slot>{children}</Slot>
      </Drawer.Trigger>
    )
  }

  return (
    <Drawer.Trigger asChild>
      <button
        className={clsx(
          "fixed top-1/2 left-1/2 antialiased -translate-y-1/2 -translate-x-1/2 h-[44px] rounded-full border bg-background px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent focus-visible:shadow-focus-ring-button md:font-medium cursor-pointer",
          className
        )}
        type="button"
      >
        {children}
      </button>
    </Drawer.Trigger>
  )
}
