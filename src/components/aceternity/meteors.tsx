import { useMemo } from 'react'
import { motion } from 'motion/react'
import { cn } from '~/lib/utils'

interface MeteorsFieldProps {
  children: React.ReactNode
  className?: string
  glowClassName?: string
  meteorCount?: number
}

interface MeteorConfig {
  id: string
  top: number
  left: number
  delay: number
  duration: number
  rotate: number
}

const DEFAULT_METEOR_COUNT = 18
const IS_TEST_ENV = typeof process !== 'undefined' && process.env.NODE_ENV === 'test'

export function MeteorsField({
  children,
  className,
  glowClassName,
  meteorCount = DEFAULT_METEOR_COUNT,
}: MeteorsFieldProps) {
  const meteors = useMemo<MeteorConfig[]>(() => {
    const count = Math.max(6, Math.min(48, meteorCount))
    return Array.from({ length: count }).map((_, index) => ({
      id: `meteor-${index}`,
      top: Math.random() * 85,
      left: Math.random() * 90,
      delay: Math.random() * 6,
      duration: 4 + Math.random() * 6,
      rotate: -45 + Math.random() * 20,
    }))
  }, [meteorCount])

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/10 bg-[#05050a] shadow-[0_25px_45px_rgba(2,6,23,0.55)]',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[radial-gradient(rgba(248,250,252,0.08)_1px,transparent_1px)] before:[background-size:24px_24px]',
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute -top-16 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-amber-500/15 blur-[120px]',
          glowClassName,
        )}
      />
      {!IS_TEST_ENV
        ? meteors.map((meteor) => (
            <motion.span
              key={meteor.id}
              aria-hidden
              className="pointer-events-none absolute h-px w-20 origin-left bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-60"
              style={{
                top: `${meteor.top}%`,
                left: `${meteor.left}%`,
                rotate: `${meteor.rotate}deg`,
              }}
              initial={{ x: '-15%', y: '15%', opacity: 0 }}
              animate={{ x: '120%', y: '-120%', opacity: [0, 1, 0] }}
              transition={{ duration: meteor.duration, repeat: Infinity, delay: meteor.delay, ease: 'linear' }}
            />
          ))
        : null}
      <div className="relative z-10">{children}</div>
    </div>
  )
}
