type DateInput = Date | number | string | null | undefined

const DEFAULT_LOCALE: Intl.LocalesArgument = 'en-US'
const DEFAULT_TIME_ZONE = 'UTC'

const numberFormatterCache = new Map<string, Intl.NumberFormat>()
const dateTimeFormatterCache = new Map<string, Intl.DateTimeFormat>()

const DATE_TIME_KEY = 'date-time'
const CLOCK_TIME_KEY = 'clock-time'

function toDate(value: DateInput): Date | null {
  if (value == null) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function getNumberFormatter(locale: Intl.LocalesArgument = DEFAULT_LOCALE) {
  const key = String(locale)
  const cached = numberFormatterCache.get(key)
  if (cached) return cached
  const formatter = new Intl.NumberFormat(locale)
  numberFormatterCache.set(key, formatter)
  return formatter
}

function getDateTimeFormatter(options: {
  locale?: Intl.LocalesArgument
  timeZone?: string
  kind: typeof DATE_TIME_KEY | typeof CLOCK_TIME_KEY
  clockSeconds?: boolean
}) {
  const locale = options.locale ?? DEFAULT_LOCALE
  const timeZone = options.timeZone ?? DEFAULT_TIME_ZONE
  const precisionKey = options.kind === CLOCK_TIME_KEY && options.clockSeconds ? ':seconds' : ':minutes'
  const key = `${options.kind}:${locale}:${timeZone}${precisionKey}`
  const cached = dateTimeFormatterCache.get(key)
  if (cached) return cached

  const formatter = new Intl.DateTimeFormat(locale, {
    ...(options.kind === DATE_TIME_KEY
      ? { dateStyle: 'medium', timeStyle: 'short' }
      : {
          hour: '2-digit',
          minute: '2-digit',
          ...(options.clockSeconds ? { second: '2-digit' } : {}),
        }),
    timeZone,
  })
  dateTimeFormatterCache.set(key, formatter)
  return formatter
}

interface FormatCountOptions {
  locale?: Intl.LocalesArgument
}

export function formatCount(value: number | bigint, options?: FormatCountOptions): string {
  if (!Number.isFinite(Number(value))) return '0'
  return getNumberFormatter(options?.locale).format(Number(value))
}

interface FormatDateTimeOptions {
  locale?: Intl.LocalesArgument
  timeZone?: string
  fallback?: string
}

export function formatDateTime(value: DateInput, options?: FormatDateTimeOptions): string {
  const date = toDate(value)
  if (!date) return options?.fallback ?? 'Unknown date'
  return getDateTimeFormatter({
    locale: options?.locale,
    timeZone: options?.timeZone,
    kind: DATE_TIME_KEY,
  }).format(date)
}

interface FormatClockTimeOptions {
  locale?: Intl.LocalesArgument
  timeZone?: string
  fallback?: string
  includeSeconds?: boolean
}

export function formatClockTime(value: DateInput, options?: FormatClockTimeOptions): string {
  const date = toDate(value)
  if (!date) return options?.fallback ?? ''
  return getDateTimeFormatter({
    locale: options?.locale,
    timeZone: options?.timeZone,
    kind: CLOCK_TIME_KEY,
    clockSeconds: options?.includeSeconds ?? false,
  }).format(date)
}
