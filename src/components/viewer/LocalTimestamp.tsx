import { ClientOnly } from '@tanstack/react-router'
import { useMemo } from 'react'
import { formatClockTime, formatDateTime } from '~/utils/intl'
import { formatLogTimestamp } from '~/utils/log-timestamp'

type DateInput = string | number | Date | null | undefined

interface LocalTimestampProps {
  value?: DateInput
  variant?: 'datetime' | 'clock'
  includeSeconds?: boolean
  showZone?: boolean
  className?: string
  fallbackLabel?: string
  forceTimeZone?: string
}

export function LocalTimestamp({
  value,
  variant = 'datetime',
  includeSeconds = false,
  showZone = false,
  className,
  fallbackLabel,
  forceTimeZone,
}: LocalTimestampProps) {
  if (!value) {
    return fallbackLabel ? <span className={className}>{fallbackLabel}</span> : null
  }

  const fallbackText = formatLogTimestamp(value, {
    style: variant === 'clock' ? 'clock' : 'datetime',
    includeSeconds,
    fallback: fallbackLabel ?? '',
  })

  return (
    <ClientOnly fallback={<span className={className}>{fallbackText}</span>}>
      <LocalTimestampClient
        value={value}
        variant={variant}
        includeSeconds={includeSeconds}
        showZone={showZone}
        className={className}
        fallbackLabel={fallbackLabel}
        forceTimeZone={forceTimeZone}
      />
    </ClientOnly>
  )
}

function LocalTimestampClient({
  value,
  variant,
  includeSeconds,
  showZone,
  className,
  fallbackLabel,
  forceTimeZone,
}: Omit<LocalTimestampProps, 'forceTimeZone'> & { value: DateInput; forceTimeZone?: string }) {
  const resolvedTimeZone = useMemo(() => {
    if (forceTimeZone) return forceTimeZone
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return undefined
    }
  }, [forceTimeZone])

  const formatted =
    variant === 'clock'
      ? formatClockTime(value, {
          timeZone: resolvedTimeZone,
          fallback: fallbackLabel ?? '',
          includeSeconds,
        })
      : formatDateTime(value, {
          timeZone: resolvedTimeZone,
          fallback: fallbackLabel ?? 'Unknown date',
        })

  const zoneLabel =
    showZone && resolvedTimeZone
      ? extractZoneAbbreviation(value, resolvedTimeZone)
      : ''

  if (!formatted) {
    return fallbackLabel ? <span className={className}>{fallbackLabel}</span> : null
  }

  return (
    <span className={className}>
      {formatted}
      {zoneLabel ? ` ${zoneLabel}` : ''}
    </span>
  )
}

function extractZoneAbbreviation(value: DateInput, timeZone: string): string {
  const date = value instanceof Date ? value : new Date(value ?? '')
  if (Number.isNaN(date.getTime())) return ''
  try {
    const formatter = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
    const part = formatter.formatToParts(date).find((entry) => entry.type === 'timeZoneName')
    return part?.value ?? ''
  } catch {
    return ''
  }
}
