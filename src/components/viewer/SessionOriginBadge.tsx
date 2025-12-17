import { Badge } from '~/components/ui/badge'
import { cn } from '~/lib/utils'
import { getSessionOriginLabel, type SessionOrigin } from '~/lib/session-origin'

interface SessionOriginBadgeProps {
  origin?: SessionOrigin
  className?: string
  size?: 'sm' | 'md'
}

const ORIGIN_STYLE: Record<SessionOrigin, string> = {
  codex: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
  'gemini-cli': 'border-fuchsia-500/40 bg-fuchsia-500/15 text-fuchsia-100',
}

export function SessionOriginBadge({ origin, className, size = 'md' }: SessionOriginBadgeProps) {
  if (!origin) return null
  const label = getSessionOriginLabel(origin)
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-[1px]' : 'text-xs px-2.5 py-0.5'
  return (
    <Badge
      variant="outline"
      aria-label={`${label} origin`}
      className={cn('font-semibold uppercase tracking-wide', sizeClass, ORIGIN_STYLE[origin], className)}
    >
      {label}
    </Badge>
  )
}
