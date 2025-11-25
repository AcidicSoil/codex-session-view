'use client';

import { useCallback, useMemo, useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'motion/react'
import { cn } from '~/lib/utils'

export interface StickySection {
  id: string
  eyebrow?: string
  title: string
  description: string
  content: React.ReactNode
}

interface StickyScrollRevealProps {
  sections: StickySection[]
  className?: string
  contentClassName?: string
  showSidebar?: boolean
}

export function StickyScrollReveal({ sections, className, contentClassName, showSidebar = true }: StickyScrollRevealProps) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? null)
  const activeSection = useMemo(
    () => sections.find((section) => section.id === activeId) ?? sections[0],
    [activeId, sections],
  )

  const handleActive = useCallback(
    (id: string) => {
      setActiveId((current) => (current === id ? current : id))
    },
    [],
  )

  if (!showSidebar) {
    return (
      <div className={cn('space-y-16', className, contentClassName)}>
        {sections.map((section) => (
          <RevealCard key={section.id} section={section} onActive={handleActive} />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)]', className)}>
      <aside className="sticky top-28 h-fit space-y-4 text-white/80">
        {activeSection?.eyebrow ? (
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">{activeSection.eyebrow}</p>
        ) : null}
        <motion.h2
          key={activeSection?.title}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-2xl font-semibold text-white"
        >
          {activeSection?.title}
        </motion.h2>
        {activeSection?.description ? (
          <p className="text-sm text-white/70">{activeSection.description}</p>
        ) : null}
      </aside>
      <div className={cn('space-y-16', contentClassName)}>
        {sections.map((section) => (
          <RevealCard key={section.id} section={section} onActive={handleActive} />
        ))}
      </div>
    </div>
  )
}

function RevealCard({ section, onActive }: { section: StickySection; onActive: (id: string) => void }) {
  const ref = useRef<HTMLDivElement | null>(null)
  const isInView = useInView(ref, { margin: '-40% 0px -40% 0px', amount: 0.3 })

  useEffect(() => {
    if (isInView) {
      onActive(section.id)
    }
  }, [isInView, onActive, section.id])

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, amount: 0.2 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-black/40 to-black/80 p-6 shadow-[0_35px_80px_rgba(0,0,0,0.35)]"
      id={section.id}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.12),transparent_60%)]" />
      </div>
      <div className="relative z-10 space-y-4">
        {section.eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-white/50">{section.eyebrow}</p>
        ) : null}
        <h3 className="text-xl font-semibold text-white">{section.title}</h3>
        <p className="text-sm text-white/70">{section.description}</p>
        <div className="rounded-2xl border border-white/5 bg-black/40 p-4">{section.content}</div>
      </div>
    </motion.div>
  )
}
