import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '~/lib/utils'

interface PlaceholdersAndVanishInputProps {
  children: ReactNode
  vanishText?: string | null
  onVanishComplete?: () => void
  placeholderPills?: string[]
  className?: string
}

interface VanishEntry {
  id: string
  text: string
}

export function PlaceholdersAndVanishInput({ children, vanishText, onVanishComplete, placeholderPills, className }: PlaceholdersAndVanishInputProps) {
  const [entries, setEntries] = useState<VanishEntry[]>([])

  useEffect(() => {
    if (!vanishText || vanishText.trim().length === 0) {
      return
    }
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `vanish-${Date.now()}`
    setEntries((current) => [...current, { id, text: vanishText }])
  }, [vanishText])

  useEffect(() => {
    if (entries.length === 0) {
      return
    }
    const timer = setTimeout(() => {
      setEntries((current) => current.slice(1))
      onVanishComplete?.()
    }, 900)
    return () => clearTimeout(timer)
  }, [entries, onVanishComplete])

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-4 shadow-inner', className)}>
      {placeholderPills && placeholderPills.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          {placeholderPills.map((pill) => (
            <span key={pill} className="rounded-full border border-border/50 px-2 py-0.5">
              {pill}
            </span>
          ))}
        </div>
      ) : null}
      {children}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-end justify-end gap-2 p-4">
        <AnimatePresence>
          {entries.map((entry) => (
            <motion.span
              key={entry.id}
              className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: -20, scale: 1 }}
              exit={{ opacity: 0, y: -36, scale: 0.95 }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
            >
              {entry.text}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
