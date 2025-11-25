'use client'

import { cn } from '~/lib/utils'

export interface FloatingNavbarItem {
  label: string
  value: string
}

interface FloatingNavbarProps {
  items: FloatingNavbarItem[]
  value: string
  onValueChange?: (value: string) => void
  className?: string
}

export function FloatingNavbar({ items, value, onValueChange, className }: FloatingNavbarProps) {
  return (
    <nav
      data-testid="viewer-floating-navbar"
      className={cn(
        'sticky top-6 z-40 mx-auto flex w-full max-w-4xl items-center justify-between rounded-full border border-white/15 bg-black/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/60 shadow-[0_15px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl',
        className,
      )}
    >
      <div className="flex flex-1 items-center justify-center gap-2">
        {items.map((item) => {
          const isActive = item.value === value
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => onValueChange?.(item.value)}
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-center transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                isActive ? 'bg-white/15 text-white' : '',
              )}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
