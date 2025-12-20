import type { ReactNode } from "react"
import clsx from "clsx"
import { Slot } from "@radix-ui/react-slot"

interface FamilyDrawerButtonProps {
  children: ReactNode
  onClick: () => void
  className?: string
  asChild?: boolean
}

export function FamilyDrawerButton({
  children,
  onClick,
  className,
  asChild = false,
}: FamilyDrawerButtonProps) {
  const button = (
    <button
      data-vaul-no-drag=""
      className={clsx(
        "flex h-12 w-full items-center gap-[15px] rounded-[16px] bg-muted px-4 text-[17px] font-semibold text-foreground transition-transform focus:scale-95 focus-visible:shadow-focus-ring-button active:scale-95 md:font-medium cursor-pointer",
        className
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  )

  if (asChild) {
    return <Slot>{button}</Slot>
  }

  return button
}
