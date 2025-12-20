import clsx from "clsx"
import { Drawer } from "vaul"
import { useFamilyDrawer } from "~/components/ui/family-drawer-context"

interface FamilyDrawerOverlayProps {
  className?: string
  onClick?: () => void
}

export function FamilyDrawerOverlay({ className, onClick }: FamilyDrawerOverlayProps) {
  const { setView } = useFamilyDrawer()

  return (
    <Drawer.Overlay
      className={clsx("fixed inset-0 z-10 bg-black/30", className)}
      onClick={onClick || (() => setView("default"))}
    />
  )
}
