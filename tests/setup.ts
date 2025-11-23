import "@testing-library/jest-dom/vitest"

// ensure env vars are loaded before any database import
import dotenv from "dotenv"
dotenv.config({ path: ".env.test" })

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
