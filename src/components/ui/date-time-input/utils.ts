import { parseDate } from 'chrono-node'

export const TIME_INCREMENT_MINUTES = 15
export const TOTAL_TIME_SLOTS = 24 * (60 / TIME_INCREMENT_MINUTES)

export const inputBaseClass =
  'bg-transparent focus:outline-hidden focus:ring-0 focus-within:outline-hidden focus-within:ring-0 sm:text-sm disabled:cursor-not-allowed disabled:opacity-50'

export const parseDateTime = (str: Date | string) => {
  if (str instanceof Date) return str
  return parseDate(str)
}

export const getDateTimeLocal = (timestamp?: Date): string => {
  const date = timestamp ? new Date(timestamp) : new Date()
  if (date.toString() === 'Invalid Date') return ''
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split(':')
    .slice(0, 2)
    .join(':')
}

const formatTimeOnly = (datetime: Date | string) =>
  new Date(datetime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  })

const formatDateOnly = (datetime: Date | string) =>
  new Date(datetime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

export const formatDateTime = (
  datetime: Date | string,
  showCalendar: boolean,
  showTimePicker: boolean,
) => {
  if (!showCalendar && showTimePicker) return formatTimeOnly(datetime)
  if (showCalendar && !showTimePicker) return formatDateOnly(datetime)

  return new Date(datetime).toLocaleTimeString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  })
}

export const getDefaultPlaceholder = (
  showCalendar: boolean,
  showTimePicker: boolean,
) => {
  if (!showCalendar && showTimePicker) return 'e.g. "5pm" or "in 2 hours"'
  if (showCalendar && !showTimePicker) return 'e.g. "tomorrow" or "next monday"'
  return 'e.g. "tomorrow at 5pm" or "in 2 hours"'
}

export type DisplayTimeFragments = {
  hour24: number
  hour12: number
  minutes: number
  period: 'AM' | 'PM' | string
  display: string
}

export const buildDisplayTime = (hour24: number, segment: number) => {
  const minutes = segment === 0 ? '00' : String(TIME_INCREMENT_MINUTES * segment).padStart(2, '0')
  const isPm = hour24 >= 12
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  const suffix = isPm ? 'PM' : 'AM'
  return `${hour12}:${minutes} ${suffix}`
}

export const parseDisplayTime = (displayTime?: string): DisplayTimeFragments | null => {
  if (!displayTime) return null
  const [time, period] = displayTime.split(' ')
  if (!time || !period) return null
  const [rawHour, rawMinutes] = time.split(':')
  const parsedHour = Number.parseInt(rawHour, 10)
  const parsedMinutes = Number.parseInt(rawMinutes, 10)
  if (Number.isNaN(parsedHour) || Number.isNaN(parsedMinutes)) return null

  const hour24 =
    period === 'AM'
      ? parsedHour === 12
        ? 0
        : parsedHour
      : parsedHour === 12
        ? 12
        : parsedHour + 12

  return {
    hour24,
    minutes: parsedMinutes,
    period,
    hour12: parsedHour === 0 ? 12 : parsedHour,
    display: displayTime,
  }
}
