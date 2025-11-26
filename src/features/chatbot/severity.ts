import type { MisalignmentRecord, MisalignmentSeverity } from '~/lib/sessions/model'

const SEVERITY_ORDER: Record<MisalignmentSeverity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

export function rankSeverity(severity: MisalignmentSeverity) {
  return SEVERITY_ORDER[severity] ?? 0
}

export function pickHigherSeverity(a: MisalignmentSeverity, b: MisalignmentSeverity) {
  return rankSeverity(a) >= rankSeverity(b) ? a : b
}

export function toSeverityLabel(severity: MisalignmentSeverity) {
  switch (severity) {
    case 'critical':
      return 'High'
    case 'high':
      return 'High'
    case 'medium':
      return 'Medium'
    case 'low':
      return 'Low'
    case 'info':
    default:
      return 'Low'
  }
}

export function getSeverityVisuals(severity: MisalignmentSeverity) {
  const label = toSeverityLabel(severity)
  if (label === 'High') {
    return {
      badgeVariant: 'destructive' as const,
      textClass: 'text-[var(--destructive-foreground)]',
      borderClass: 'border-[var(--destructive)]',
    }
  }
  if (label === 'Medium') {
    return {
      badgeVariant: 'outline' as const,
      textClass: 'text-[var(--warning-foreground)]',
      borderClass: 'border-[var(--warning)]',
    }
  }
  return {
    badgeVariant: 'secondary' as const,
    textClass: 'text-[var(--info-foreground)]',
    borderClass: 'border-[var(--info)]',
  }
}

export function selectPrimaryMisalignment(records: MisalignmentRecord[]) {
  if (!records.length) return null
  return [...records].sort((a, b) => rankSeverity(b.severity) - rankSeverity(a.severity))[0]
}
