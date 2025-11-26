import { Button } from '~/components/ui/button'
import { cn } from '~/lib/utils'
import type { MisalignmentRecord } from '~/lib/sessions/model'
import { getSeverityVisuals, selectPrimaryMisalignment, toSeverityLabel } from '~/features/chatbot/severity'

interface MisalignmentBannerProps {
  misalignments: MisalignmentRecord[]
  onReview: (records: MisalignmentRecord[]) => void
  className?: string
}

export function MisalignmentBanner({ misalignments, onReview, className }: MisalignmentBannerProps) {
  const open = misalignments.filter((item) => item.status === 'open')
  if (open.length === 0) {
    return null
  }
  const primary = selectPrimaryMisalignment(open)
  if (!primary) {
    return null
  }
  const visuals = getSeverityVisuals(primary.severity)
  const borderColor =
    visuals.badgeVariant === 'destructive'
      ? 'var(--destructive)'
      : visuals.badgeVariant === 'outline'
        ? 'var(--warning)'
        : 'var(--info)'
  const severityLabel = toSeverityLabel(primary.severity)

  return (
    <div className={cn('rounded-2xl border bg-background/80 p-4 shadow-inner', className)} style={{ borderColor }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={cn('text-sm font-semibold', visuals.textClass)}>AGENTS issues detected</p>
          <p className="text-xs text-muted-foreground">
            This session has {open.length} potential violations of your AGENTS rules.
          </p>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Highest severity: {severityLabel}</p>
        </div>
        <Button
          size="sm"
          variant={visuals.badgeVariant === 'outline' ? 'outline' : visuals.badgeVariant}
          onClick={() => onReview(open)}
        >
          Review issues
        </Button>
      </div>
    </div>
  )
}
