type DateInput = Date | number | string | null | undefined

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

const ISOISH_REGEX =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(?:\s*(Z|[+-]\d{2}:?\d{2}))?$/i

interface ParsedTimestamp {
  year: number
  month: number
  day: number
  hour?: number
  minute?: number
  second?: number
  millisecond?: number
  offset?: string
}

export interface FormatLogTimestampOptions {
  fallback?: string
  style?: 'datetime' | 'clock'
  includeSeconds?: boolean
}

export function formatLogTimestamp(
  value: DateInput,
  options?: FormatLogTimestampOptions
): string {
  const fallback = options?.fallback ?? (options?.style === 'clock' ? '' : 'Unknown date')
  if (value == null) return fallback

  if (typeof value === 'string') {
    const parsed = parseTimestamp(value)
    if (parsed) return buildLabel(parsed, options)
    return value
  }

  if (value instanceof Date) {
    return formatLogTimestamp(value.toISOString(), options)
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatLogTimestamp(new Date(value).toISOString(), options)
  }

  return fallback
}

function parseTimestamp(value: string): ParsedTimestamp | null {
  const trimmed = value.trim()
  const match = trimmed.match(ISOISH_REGEX)
  if (!match) return null

  const [, year, month, day, hour, minute, second, millisecond, offset] = match
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: hour != null ? Number(hour) : undefined,
    minute: minute != null ? Number(minute) : undefined,
    second: second != null ? Number(second) : undefined,
    millisecond: millisecond != null ? Number(millisecond) : undefined,
    offset: normalizeOffset(offset),
  }
}

function normalizeOffset(offset?: string | null): string | undefined {
  if (!offset) return undefined
  if (offset.toUpperCase() === 'Z') return 'UTC'
  const normalized = offset.includes(':')
    ? offset
    : `${offset.slice(0, 3)}:${offset.slice(3)}`
  return `UTC${normalized}`
}

function buildLabel(parsed: ParsedTimestamp, options?: FormatLogTimestampOptions): string {
  const style = options?.style ?? 'datetime'
  const includeSeconds = options?.includeSeconds ?? false
  const clock = formatClock(parsed, includeSeconds)

  if (style === 'clock') {
    if (!clock) return options?.fallback ?? ''
    return parsed.offset ? `${clock} ${parsed.offset}` : clock
  }

  const dateLabel = formatDate(parsed)
  if (!clock) {
    return parsed.offset ? `${dateLabel} ${parsed.offset}` : dateLabel
  }
  return parsed.offset ? `${dateLabel} ${clock} ${parsed.offset}` : `${dateLabel} ${clock}`
}

function formatDate(parsed: ParsedTimestamp): string {
  const monthIndex = Math.max(0, Math.min(11, parsed.month - 1))
  const monthLabel = MONTH_LABELS[monthIndex] ?? 'Jan'
  return `${monthLabel} ${parsed.day}, ${parsed.year}`
}

function formatClock(parsed: ParsedTimestamp, includeSeconds: boolean): string | null {
  if (typeof parsed.hour !== 'number' || typeof parsed.minute !== 'number') return null
  const hour = parsed.hour % 24
  const minute = parsed.minute
  const second = typeof parsed.second === 'number' ? parsed.second : null
  const period = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  const minuteLabel = minute.toString().padStart(2, '0')
  const secondsLabel = includeSeconds && second != null ? `:${second.toString().padStart(2, '0')}` : ''
  return `${hour12}:${minuteLabel}${secondsLabel} ${period}`
}
