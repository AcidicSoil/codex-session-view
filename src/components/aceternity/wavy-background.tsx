'use client';

import { cn } from '~/lib/utils'

interface WavyBackgroundProps {
  children: React.ReactNode
  className?: string
}

export function WavyBackground({ children, className }: WavyBackgroundProps) {
  return (
    <div className={cn('relative isolate overflow-hidden rounded-[2.5rem] border border-border/50 bg-background', className)}>
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <svg className="size-full" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 800 600">
          <path
            d="M0 300 Q 200 340 400 300 T 800 300 V 600 H0Z"
            fill="url(#waveGradient)"
            opacity="0.35"
          />
          <defs>
            <linearGradient id="waveGradient" x1="0%" x2="100%" y1="0%" y2="0%">
              <stop offset="0%" stopColor="rgba(55,136,255,0.35)" />
              <stop offset="50%" stopColor="rgba(163,76,255,0.2)" />
              <stop offset="100%" stopColor="rgba(246,60,255,0.2)" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  )
}
