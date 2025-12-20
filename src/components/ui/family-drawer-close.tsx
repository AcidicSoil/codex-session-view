import type { ReactNode } from "react"
import clsx from "clsx"
import { Slot } from "@radix-ui/react-slot"
import { Drawer } from "vaul"
import { FamilyDrawerCloseIcon } from "~/components/ui/family-drawer-close-icon"

interface FamilyDrawerCloseProps {
  children?: ReactNode
  asChild?: boolean
  className?: string
}

export function FamilyDrawerClose({
  children,
  asChild = false,
  className,
}: FamilyDrawerCloseProps) {
  const defaultClose = (
    <button
      data-vaul-no-drag=""
      className={clsx(
        "absolute right-8 top-7 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-transform focus:scale-95 focus-visible:shadow-focus-ring-button active:scale-75 cursor-pointer",
        className
      )}
      type="button"
    >
      {children || <FamilyDrawerCloseIcon />}
    </button>
  )

  if (asChild) {
    return (
      <Drawer.Close asChild>
        <Slot>{defaultClose}</Slot>
      </Drawer.Close>
    )
  }

  return <Drawer.Close asChild>{defaultClose}</Drawer.Close>
}
