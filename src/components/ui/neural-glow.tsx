import type { HTMLAttributes } from 'react'
import { cn } from '~/lib/utils'

type NeuralGlowVariant = 'panel' | 'background'

interface NeuralGlowProps extends HTMLAttributes<HTMLDivElement> {
  variant?: NeuralGlowVariant
}

export function NeuralGlow({ className, children, variant = 'panel', ...props }: NeuralGlowProps) {
  const baseClass =
    variant === 'background'
      ? 'relative min-h-screen overflow-hidden bg-[#03050a] p-0'
      : 'relative rounded-3xl border border-white/15 bg-black/80 p-4'

  const overlayClass =
    variant === 'background'
      ? 'pointer-events-none absolute inset-0 bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-emerald-500/25 via-sky-500/15 to-pink-500/30 blur-3xl'
      : 'pointer-events-none absolute inset-0 rounded-3xl bg-[conic-gradient(at_top,_var(--tw-gradient-stops))] from-emerald-500/30 via-sky-500/20 to-pink-500/30 blur-3xl'

  const sheenClass =
    variant === 'background'
      ? 'pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent'
      : 'pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/5 via-transparent to-transparent'

  return (
    <div className={cn(baseClass, className)} {...props}>
      <div className={overlayClass} />
      <div className={sheenClass} />
      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  )
}
