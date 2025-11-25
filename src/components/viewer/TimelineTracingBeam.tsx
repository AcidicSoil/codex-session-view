'use client'

import { useRef } from 'react'
import { motion, useScroll, useSpring, useTransform } from 'motion/react'
import { cn } from '~/lib/utils'

interface TimelineTracingBeamProps {
  children: React.ReactNode
  className?: string
}

/**
 * Wraps the timeline list with a relative container and renders a progress beam
 * that grows as the section scrolls into view.
 */
export function TimelineTracingBeam({ children, className }: TimelineTracingBeamProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'end 0.15'],
  })
  const easedProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const beamScale = useTransform(easedProgress, (value) => Math.max(value, 0.04))

  return (
    <div ref={ref} className={cn('relative pl-6', className)}>
      <div className="pointer-events-none absolute inset-y-4 left-1 w-px rounded-full bg-white/10" aria-hidden>
        <motion.span
          data-testid="timeline-tracing-beam"
          className="absolute inset-x-0 top-0 h-full origin-top rounded-full bg-gradient-to-b from-cyan-400 via-purple-500 to-fuchsia-500 blur-[0.5px]"
          style={{ scaleY: beamScale }}
        />
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
