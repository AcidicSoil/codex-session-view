import "@testing-library/jest-dom/vitest"

import * as React from "react"
import { vi } from "vitest"
import dotenv from "dotenv"

// ensure env vars are loaded before any database import
dotenv.config({ path: ".env.test" })

type DrawerContextValue = {
  open: boolean
  setOpen: (next: boolean) => void
  view: string
  setView: (view: string) => void
  views?: Record<string, React.ComponentType>
}

const DrawerContext = React.createContext<DrawerContextValue | null>(null)

function useDrawerMock() {
  const context = React.useContext(DrawerContext)
  if (!context) {
    throw new Error("FamilyDrawer components must be nested inside FamilyDrawerRoot (test mock).")
  }
  return context
}

vi.mock("~/components/ui/family-drawer", () => {
  function FamilyDrawerRoot({
    open,
    onOpenChange,
    children,
    views,
  }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode; views?: Record<string, React.ComponentType> }) {
    const [internalOpen, setInternalOpen] = React.useState(open ?? false)
    const [currentView, setCurrentView] = React.useState("default")
    const actualOpen = open ?? internalOpen
    const setOpen = React.useCallback(
      (next: boolean) => {
        onOpenChange?.(next)
        if (open === undefined) {
          setInternalOpen(next)
        }
      },
      [open, onOpenChange],
    )
    const value = React.useMemo(
      () => ({ open: actualOpen, setOpen, view: currentView, setView: setCurrentView, views }),
      [actualOpen, setOpen, currentView, views],
    )
    return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  }

  function wrapChild(
    child: React.ReactNode,
    handler: (event: React.SyntheticEvent) => void,
  ): React.ReactElement | null {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onClick: (event: React.SyntheticEvent) => {
          if (typeof child.props.onClick === "function") {
            child.props.onClick(event)
          }
          handler(event)
        },
      })
    }
    return null
  }

  function FamilyDrawerTrigger({
    children,
    asChild = false,
  }: {
    children: React.ReactNode
    asChild?: boolean
  }) {
    const { setOpen } = useDrawerMock()
    if (asChild) {
      const wrapped = wrapChild(children, () => setOpen(true))
      if (wrapped) return wrapped
    }
    return (
      <button type="button" onClick={() => setOpen(true)}>
        {children}
      </button>
    )
  }

  function FamilyDrawerPortal({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }

  function FamilyDrawerOverlay() {
    return null
  }

  function FamilyDrawerContent({ children }: { children: React.ReactNode }) {
    const { open } = useDrawerMock()
    if (!open) return null
    return <div data-testid="family-drawer-content">{children}</div>
  }

  function FamilyDrawerAnimatedWrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }

  function FamilyDrawerAnimatedContent({ children }: { children: React.ReactNode }) {
    return <>{children}</>
  }

  function FamilyDrawerHeader({
    icon,
    title,
    description,
  }: {
    icon: React.ReactNode
    title: string
    description: string
  }) {
    return (
      <div data-testid="family-drawer-header">
        {icon}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    )
  }

  function FamilyDrawerClose({ children }: { children?: React.ReactNode }) {
    const { setOpen } = useDrawerMock()
    return (
      <button type="button" onClick={() => setOpen(false)}>
        {children ?? "Close"}
      </button>
    )
  }

  function FamilyDrawerViewContent({ views }: { views?: Record<string, React.ComponentType> }) {
    const context = useDrawerMock()
    const registry = views ?? context.views
    if (!registry) {
      return null
    }
    const ViewComponent = registry[context.view] ?? registry.default
    if (!ViewComponent) return null
    return <ViewComponent />
  }

  function useFamilyDrawer() {
    const context = useDrawerMock()
    return {
      isOpen: context.open,
      view: context.view,
      setView: context.setView,
      opacityDuration: 0,
      elementRef: () => null,
      bounds: { height: 0, width: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0 },
      views: context.views,
      setOpen: context.setOpen,
    }
  }

  return {
    FamilyDrawerRoot,
    FamilyDrawerTrigger,
    FamilyDrawerPortal,
    FamilyDrawerOverlay,
    FamilyDrawerContent,
    FamilyDrawerAnimatedWrapper,
    FamilyDrawerAnimatedContent,
    FamilyDrawerHeader,
    FamilyDrawerClose,
    FamilyDrawerViewContent,
    useFamilyDrawer,
  }
})

if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | Document | null = null
    readonly rootMargin: string = "0px"
    readonly thresholds: readonly number[] = []
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords(): IntersectionObserverEntry[] { return [] }
    unobserve() {}
  }
  // @ts-expect-error - assigning to readonly interface for tests
  window.IntersectionObserver = MockIntersectionObserver
}

if (typeof globalThis.ResizeObserver === "undefined") {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  // @ts-expect-error - jsdom shim
  globalThis.ResizeObserver = ResizeObserverStub
}

if (typeof window !== "undefined") {
  if (typeof window.matchMedia !== "function") {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false
      },
    })
  }
  const proto = window.HTMLElement?.prototype
  if (proto) {
    if (!proto.setPointerCapture) {
      proto.setPointerCapture = () => {}
    }
    if (!proto.releasePointerCapture) {
      proto.releasePointerCapture = () => {}
    }
  }
}
