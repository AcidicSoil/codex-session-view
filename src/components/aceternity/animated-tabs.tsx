'use client';

import { motion, AnimatePresence } from 'motion/react'
import { cn } from '~/lib/utils'

export interface AnimatedTabConfig {
  value: string
  label: string
  description?: string
  content: React.ReactNode
}

interface AnimatedTabsProps {
  tabs: AnimatedTabConfig[]
  value: string
  onValueChange: (value: string) => void
  className?: string
}

export function AnimatedTabs({ tabs, value, onValueChange, className }: AnimatedTabsProps) {
  const activeTab = tabs.find((tab) => tab.value === value) ?? tabs[0]
  return (
    <div className={cn('space-y-6', className)}>
      <div className="relative flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 text-xs uppercase tracking-[0.35em] text-white/60">
        {tabs.map((tab) => {
          const isActive = tab.value === (activeTab?.value ?? tab.value)
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onValueChange(tab.value)}
              className={cn(
                'relative flex-1 cursor-pointer overflow-hidden rounded-xl px-4 py-3 text-center font-semibold transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                isActive ? 'text-white' : 'text-white/60',
              )}
            >
              <span className="relative z-10">{tab.label}</span>
              <AnimatePresence>
                {isActive ? (
                  <motion.span
                    layoutId="animated-tabs-highlight"
                    className="absolute inset-0 rounded-xl bg-white/15"
                    transition={{ type: 'spring', stiffness: 320, damping: 35 }}
                  />
                ) : null}
              </AnimatePresence>
            </button>
          )
        })}
      </div>
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/70 p-6 shadow-[0_25px_50px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab?.value ?? 'tab'}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {activeTab?.description ? (
              <p className="mb-6 text-xs uppercase tracking-[0.4em] text-white/50">{activeTab.description}</p>
            ) : null}
            <div>{activeTab?.content}</div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
