import type { ReactNode } from "react"
import { Drawer } from "vaul"

export function FamilyDrawerPortal({ children }: { children: ReactNode }) {
  return <Drawer.Portal>{children}</Drawer.Portal>
}
