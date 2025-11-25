'use client';

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '~/lib/utils'

interface TracingBeamProps extends React.HTMLAttributes<HTMLDivElement> {
  outerClassName?: string
}

/**
 * Scroll container that hides the native scrollbar and renders a slim,
 * neon-like beam to show progress similar to Aceternity's tracing-beam demo.
 */
export function TracingBeam({ children, className, outerClassName, ...props }: TracingBeamProps) {
  const ref = useRef<HTMLDivElement | null>(null)
  const [thumbTop, setThumbTop] = useState(16)
  const [thumbHeight, setThumbHeight] = useState(140)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = node
      const maxScroll = Math.max(scrollHeight - clientHeight, 1)
      const ratio = scrollHeight <= clientHeight ? 0 : scrollTop / maxScroll
      const visibleRatio = scrollHeight <= clientHeight ? 1 : clientHeight / scrollHeight
      const nextHeight = Math.max(clientHeight * visibleRatio * 0.6, 60)
      setThumbHeight(nextHeight)
      setThumbTop(ratio * (clientHeight - nextHeight) + 16)
    }
    handleScroll()
    node.addEventListener('scroll', handleScroll, { passive: true })
    return () => node.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={cn('relative', outerClassName)}>
      <div
        ref={ref}
        {...props}
        className={cn(
          'h-full overflow-y-auto pr-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
          className,
        )}
      >
        {children}
      </div>
      <div className="pointer-events-none absolute inset-y-4 right-2 w-1 rounded-full bg-white/5">
        <motion.span
          aria-hidden
          className="absolute left-1/2 w-full -translate-x-1/2 rounded-full bg-gradient-to-b from-cyan-400 via-purple-500 to-fuchsia-500 blur-[1px]"
          style={{ top: thumbTop, height: thumbHeight }}
          transition={{ type: 'spring', stiffness: 200, damping: 30 }}
        />
      </div>
    </div>
  )
}
