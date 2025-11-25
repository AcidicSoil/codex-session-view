'use client';

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '~/lib/utils'
import { TextGenerateEffect } from './text-generate-effect'

export interface NavbarMenuItem {
  value: string
  label: string
  description: string
  eyebrow?: string
  kpi?: string
  icon?: React.ReactNode
}

interface NavbarMenuProps {
  items: NavbarMenuItem[]
  value: string
  onValueChange?: (value: string) => void
  className?: string
  subtitle?: string
  actionSlot?: React.ReactNode
}

export function NavbarMenu({ items, value, onValueChange, className, subtitle, actionSlot }: NavbarMenuProps) {
  const [hovered, setHovered] = useState<string | null>(null)
  const activeValue = hovered ?? value
  const activeItem = useMemo(() => items.find((item) => item.value === activeValue) ?? items[0], [activeValue, items])

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-white/10 bg-black/80 p-6 text-white shadow-[0_25px_65px_rgba(0,0,0,0.45)] backdrop-blur-2xl', className)}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsla(268,95%,62%,0.25),transparent)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_80%_20%,hsla(190,89%,60%,0.38),transparent)]" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-12">
        <div className="flex-1 space-y-4">
          {subtitle ? (
            <TextGenerateEffect text={subtitle} className="text-xs uppercase tracking-[0.4em] text-white/60" />
          ) : null}
          <div>
            <motion.h1
              key={activeItem?.label ?? 'viewer-nav'}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="text-3xl font-semibold tracking-tight"
            >
              {activeItem?.label ?? 'Workspace'}
            </motion.h1>
            <motion.p
              key={`${activeItem?.value}-desc`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut', delay: 0.06 }}
              className="mt-2 max-w-xl text-base text-white/70"
            >
              {activeItem?.description}
            </motion.p>
          </div>
          {actionSlot ? <div className="pt-2">{actionSlot}</div> : null}
        </div>
        <div className="flex w-full flex-col gap-3 lg:max-w-md">
          {items.map((item) => {
            const isActive = item.value === activeValue
            return (
              <button
                key={item.value}
                type="button"
                onMouseEnter={() => setHovered(item.value)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(item.value)}
                onBlur={() => setHovered(null)}
                onClick={() => onValueChange?.(item.value)}
                className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
                    {item.eyebrow}
                  </div>
                  <p className="text-base font-medium text-white/90">{item.label}</p>
                  <p className="text-sm text-white/60">{item.description}</p>
                </div>
                {item.kpi ? <span className="text-xs font-semibold text-white/70">{item.kpi}</span> : null}
                <AnimatePresence>
                  {isActive ? (
                    <motion.span
                      layoutId="navbar-menu-active"
                      className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-white/20 to-white/5"
                      transition={{ type: 'spring', stiffness: 420, damping: 40, mass: 1 }}
                    />
                  ) : null}
                </AnimatePresence>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
