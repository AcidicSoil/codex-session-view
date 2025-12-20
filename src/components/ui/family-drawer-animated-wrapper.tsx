import type { ReactNode } from "react"
import clsx from "clsx"
import { useFamilyDrawer } from "~/components/ui/family-drawer-context"

interface FamilyDrawerAnimatedWrapperProps {
  children: ReactNode
  className?: string
}

export function FamilyDrawerAnimatedWrapper({
  children,
  className,
}: FamilyDrawerAnimatedWrapperProps) {
  const { elementRef } = useFamilyDrawer()

  return (
    <div
      ref={elementRef}
      className={clsx("px-6 pb-6 pt-2.5 antialiased", className)}
    >
      {children}
    </div>
  )
}
