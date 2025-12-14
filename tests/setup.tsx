import "@testing-library/jest-dom/vitest"

import * as React from "react"
import { vi } from "vitest"
import dotenv from "dotenv"

// ensure env vars are loaded before any database import
dotenv.config({ path: ".env.test" })

const DrawerContext = React.createContext<{ open: boolean; setOpen: (next: boolean) => void } | null>(null)

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
  }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
    const [internalOpen, setInternalOpen] = React.useState(open ?? false)
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
    const value = React.useMemo(() => ({ open: actualOpen, setOpen }), [actualOpen, setOpen])
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
