import type { ReactNode } from "react"
import clsx from "clsx"
import { motion } from "motion/react"
import { Slot } from "@radix-ui/react-slot"
import { Drawer } from "vaul"
import { useFamilyDrawer } from "~/components/ui/family-drawer-context"

interface FamilyDrawerContentProps {
  children: ReactNode
  className?: string
  asChild?: boolean
}

export function FamilyDrawerContent({
  children,
  className,
  asChild = false,
}: FamilyDrawerContentProps) {
  const { bounds } = useFamilyDrawer()

  const content = (
    <motion.div
      animate={{
        height: bounds.height,
        transition: {
          duration: 0.27,
          ease: [0.25, 1, 0.5, 1],
        },
      }}
    >
      {children}
    </motion.div>
  )

  if (asChild) {
    return (
      <Drawer.Content
        asChild
        className={clsx(
          "fixed inset-x-4 bottom-4 z-10 mx-auto max-w-[361px] overflow-hidden rounded-[36px] bg-background outline-none md:mx-auto md:w-full",
          className
        )}
      >
        <Slot>{content}</Slot>
      </Drawer.Content>
    )
  }

  return (
    <Drawer.Content
      asChild
      className={clsx(
        "fixed inset-x-4 bottom-4 z-10 mx-auto max-w-[361px] overflow-hidden rounded-[36px] bg-background outline-none md:mx-auto md:w-full",
        className
      )}
    >
      {content}
    </Drawer.Content>
  )
}
