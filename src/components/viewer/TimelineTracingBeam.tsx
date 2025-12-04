'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { cn } from '~/lib/utils'

interface TimelineTracingBeamProps {
  children: React.ReactNode
  className?: string
}

type ScrollRegistrar = (node: HTMLElement | null) => void

const TimelineBeamContext = createContext<ScrollRegistrar | null>(null)

export function useTimelineBeamScrollRegistrar() {
  return useContext(TimelineBeamContext)
}

/**
 * Wraps the timeline list with a retro-industrial dotted glow, exposes a
 * scroll-container registrar for descendants, and renders the animated neon
 * beam that tracks progress through the scrollable props list.
 */
export function TimelineTracingBeam({ children, className }: TimelineTracingBeamProps) {
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const shellRef = useRef<HTMLDivElement | null>(null)
  const [, forceRerender] = useState(0)
  const [hydrated, setHydrated] = useState(false)
  const registrar = useCallback<ScrollRegistrar>((node) => {
    scrollContainerRef.current = node ?? null
    forceRerender((count) => count + 1)
  }, [])
  const activeRef = scrollContainerRef.current ? scrollContainerRef : shellRef
  useEffect(() => {
    setHydrated(true)
  }, [])
  const scrollConfig = hydrated
    ? {
        container: activeRef,
        target: activeRef,
        offset: ['start 0.95', 'end 0.1'] as const,
      }
    : {
        offset: ['start 0.95', 'end 0.1'] as const,
      }
  const { scrollYProgress } = useScroll(scrollConfig)
  const easedProgress = useSpring(scrollYProgress, { stiffness: 140, damping: 32, mass: 0.4 })
  const beamScale = useTransform(easedProgress, (value) => Math.max(value, 0.05))

  return (
    <TimelineBeamContext.Provider value={registrar}>
      <div
        ref={shellRef}
        className={cn(
          'relative overflow-hidden rounded-3xl border border-white/10 bg-[#04060f]',
          'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(rgba(148,163,184,0.18)_1px,transparent_1px)] before:[background-size:26px_26px]',
          className,
        )}
      >
        <div className="pointer-events-none absolute -top-32 left-1/3 h-72 w-72 rounded-full bg-emerald-400/20 blur-[140px]" />
        <div className="pointer-events-none absolute -bottom-20 right-1/4 h-60 w-60 rounded-full bg-cyan-500/10 blur-[130px]" />
        <div className="relative pl-8">
          <div className="pointer-events-none absolute inset-y-10 left-4 w-px rounded-full bg-white/10" aria-hidden>
            <motion.span
              data-testid="timeline-tracing-beam"
              className="absolute inset-x-0 top-0 h-full origin-top rounded-full bg-gradient-to-b from-emerald-300 via-sky-500 to-fuchsia-500"
              style={{ scaleY: beamScale }}
            />
          </div>
          <div className="relative">{children}</div>
        </div>
      </div>
    </TimelineBeamContext.Provider>
  )
}
