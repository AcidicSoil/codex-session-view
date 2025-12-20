import { useMemo, useRef, useState } from "react"
import useMeasure from "react-use-measure"
import { Drawer } from "vaul"
import {
  FamilyDrawerContext,
  type FamilyDrawerContextValue,
  type FamilyDrawerRootProps,
  type ViewsRegistry,
} from "~/components/ui/family-drawer-context"

export function FamilyDrawerRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  defaultView = "default",
  onViewChange,
  views: customViews,
}: FamilyDrawerRootProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const [view, setView] = useState(defaultView)
  const [elementRef, bounds] = useMeasure()
  const previousHeightRef = useRef<number>(0)

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setIsOpen = onOpenChange || setInternalOpen

  const opacityDuration = useMemo(() => {
    const currentHeight = bounds.height
    const previousHeight = previousHeightRef.current

    const MIN_DURATION = 0.15
    const MAX_DURATION = 0.27

    if (!previousHeightRef.current) {
      previousHeightRef.current = currentHeight
      return MIN_DURATION
    }

    const heightDifference = Math.abs(currentHeight - previousHeight)
    previousHeightRef.current = currentHeight

    const duration = Math.min(
      Math.max(heightDifference / 500, MIN_DURATION),
      MAX_DURATION
    )

    return duration
  }, [bounds.height])

  const handleViewChange = (newView: string) => {
    setView(newView)
    onViewChange?.(newView)
  }

  const views: ViewsRegistry | undefined =
    customViews && Object.keys(customViews).length > 0 ? customViews : undefined

  const contextValue: FamilyDrawerContextValue = {
    isOpen,
    view,
    setView: handleViewChange,
    opacityDuration,
    elementRef,
    bounds,
    views,
  }

  return (
    <FamilyDrawerContext.Provider value={contextValue}>
      <Drawer.Root open={isOpen} onOpenChange={setIsOpen}>
        {children}
      </Drawer.Root>
    </FamilyDrawerContext.Provider>
  )
}
