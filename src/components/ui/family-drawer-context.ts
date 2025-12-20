import { createContext, useContext } from "react"
import type { ComponentType, ReactNode } from "react"
import type useMeasure from "react-use-measure"

export type ViewComponent = ComponentType<Record<string, unknown>>

export interface ViewsRegistry {
  [viewName: string]: ViewComponent
}

export interface FamilyDrawerContextValue {
  isOpen: boolean
  view: string
  setView: (view: string) => void
  opacityDuration: number
  elementRef: ReturnType<typeof useMeasure>[0]
  bounds: ReturnType<typeof useMeasure>[1]
  views: ViewsRegistry | undefined
}

export const FamilyDrawerContext = createContext<FamilyDrawerContextValue | undefined>(
  undefined
)

export function useFamilyDrawer() {
  const context = useContext(FamilyDrawerContext)
  if (!context) {
    throw new Error(
      "FamilyDrawer components must be used within FamilyDrawerRoot"
    )
  }
  return context
}

export interface FamilyDrawerRootProps {
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  defaultView?: string
  onViewChange?: (view: string) => void
  views?: ViewsRegistry
}
