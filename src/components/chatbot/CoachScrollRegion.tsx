import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ScrollArea } from '~/components/ui/scroll-area'
import { cn } from '~/lib/utils'

interface CoachScrollRegistryEntry {
  id: string
  label: string
  order: number
  ref: React.RefObject<HTMLDivElement>
}

interface CoachScrollContextValue {
  registerRegion: (entry: CoachScrollRegistryEntry) => () => void
  focusAdjacentRegion: (currentId: string, direction: 1 | -1) => void
  announce: (message: string) => void
  instructionsId: string
}

const CoachScrollContext = createContext<CoachScrollContextValue | null>(null)

export function CoachScrollProvider({ children }: { children: ReactNode }) {
  const [regions, setRegions] = useState<CoachScrollRegistryEntry[]>([])
  const [liveMessage, setLiveMessage] = useState('')
  const instructionsId = useId()

  const registerRegion = useCallback((entry: CoachScrollRegistryEntry) => {
    setRegions((prev) => {
      const filtered = prev.filter((item) => item.id !== entry.id)
      const next = [...filtered, entry]
      next.sort((a, b) => a.order - b.order)
      return next
    })
    return () => {
      setRegions((prev) => prev.filter((item) => item.id !== entry.id))
    }
  }, [])

  const focusAdjacentRegion = useCallback(
    (currentId: string, direction: 1 | -1) => {
      if (!regions.length) return
      const currentIndex = regions.findIndex((entry) => entry.id === currentId)
      const startIndex = currentIndex === -1 ? 0 : currentIndex
      const nextIndex = (startIndex + direction + regions.length) % regions.length
      const next = regions[nextIndex]
      next?.ref.current?.focus({ preventScroll: true })
      if (next) {
        setLiveMessage(`Focused scroll region: ${next.label}`)
      }
    },
    [regions],
  )

  const announce = useCallback((message: string) => {
    setLiveMessage(message)
  }, [])

  const value = useMemo(
    () => ({ registerRegion, focusAdjacentRegion, announce, instructionsId }),
    [announce, focusAdjacentRegion, instructionsId, registerRegion],
  )

  return (
    <CoachScrollContext.Provider value={value}>
      {children}
      <p id={instructionsId} className="sr-only">
        Use Page Up or Page Down to move within the focused scroll panel. Home jumps to the top, End jumps to the bottom.
        Hold Shift while scrolling to move focus between Chat Dock, AI Analysis, and Hook Discovery regions.
      </p>
      <span aria-live="polite" className="sr-only">
        {liveMessage}
      </span>
    </CoachScrollContext.Provider>
  )
}

interface CoachScrollRegionProps extends React.ComponentProps<typeof ScrollArea> {
  label: string
  order: number
  regionId?: string
  isActive?: boolean
  outerClassName?: string
  contentClassName?: string
  ['data-testid']?: string
}

export const CoachScrollRegion = forwardRef<HTMLDivElement, CoachScrollRegionProps>(function CoachScrollRegion(
  {
    label,
    order,
    regionId,
    isActive = true,
    outerClassName,
    contentClassName,
    className,
    children,
    ['data-testid']: dataTestId,
    ...scrollProps
  },
  forwardedRef,
) {
  const ctx = useContext(CoachScrollContext)
  if (!ctx) {
    throw new Error('CoachScrollRegion must be rendered within CoachScrollProvider')
  }
  const { registerRegion, focusAdjacentRegion, announce, instructionsId } = ctx
  const autoId = useId()
  const id = regionId ?? autoId
  const containerRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (!isActive) return undefined
    const cleanup = registerRegion({ id, label, order, ref: containerRef })
    return cleanup
  }, [id, isActive, label, order, registerRegion])

  useEffect(() => {
    if (!containerRef.current) return
    viewportRef.current = containerRef.current.querySelector(
      '[data-slot="scroll-area-viewport"]',
    ) as HTMLDivElement | null
  })

  const focusRegion = useCallback(() => {
    setIsFocused(true)
    announce(`Focused scroll region: ${label}`)
  }, [announce, label])

  const blurRegion = useCallback(() => {
    setIsFocused(false)
  }, [])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!viewportRef.current) return
      if (event.key === 'PageDown') {
        event.preventDefault()
        viewportRef.current.scrollBy({ top: viewportRef.current.clientHeight, behavior: 'smooth' })
        return
      }
      if (event.key === 'PageUp') {
        event.preventDefault()
        viewportRef.current.scrollBy({ top: -viewportRef.current.clientHeight, behavior: 'smooth' })
        return
      }
      if (event.key === 'Home') {
        event.preventDefault()
        viewportRef.current.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }
      if (event.key === 'End') {
        event.preventDefault()
        viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' })
        return
      }
      if (event.key === 'Tab' && isFocused) {
        event.preventDefault()
        focusAdjacentRegion(id, event.shiftKey ? -1 : 1)
      }
    },
    [focusAdjacentRegion, id, isFocused],
  )

  const handleWheelCapture = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      event.stopPropagation()
      if (event.shiftKey) {
        event.preventDefault()
        focusAdjacentRegion(id, event.deltaY >= 0 ? 1 : -1)
      }
    },
    [focusAdjacentRegion, id],
  )

  const handleTouchMoveCapture = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }, [])

  const mergedRef = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        forwardedRef.current = node
      }
    },
    [forwardedRef],
  )

  return (
    <div
      ref={mergedRef}
      role="region"
      aria-label={label}
      aria-describedby={instructionsId}
      tabIndex={isActive ? 0 : -1}
      data-testid={dataTestId}
      data-coach-scroll-region={id}
      data-coach-scroll-active={isFocused || isHovered ? 'true' : undefined}
      className={cn('coach-scroll-region', outerClassName)}
      onFocus={focusRegion}
      onBlur={blurRegion}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onKeyDown={handleKeyDown}
      onWheelCapture={handleWheelCapture}
      onTouchMoveCapture={handleTouchMoveCapture}
      data-coach-scroll-disabled={isActive ? undefined : 'true'}
    >
      <ScrollArea className={cn('coach-scroll-area', className)} {...scrollProps}>
        <div className={cn('coach-scroll-body', contentClassName)}>{children}</div>
      </ScrollArea>
    </div>
  )
})

export function useCoachScrollViewport(ref: React.RefObject<HTMLDivElement>) {
  return ref.current?.querySelector('[data-slot="scroll-area-viewport"]') as
    | ScrollAreaPrimitive.ScrollAreaViewportElement
    | null
}
