import { describe, expect, it } from 'vitest'
import { formatClockTime, formatCount, formatDateTime } from '~/utils/intl'

describe('intl helpers', () => {
  it('formats counts with provided locale', () => {
    const locale = 'de-DE'
    const expected = new Intl.NumberFormat(locale).format(12345)
    expect(formatCount(12345, { locale })).toBe(expected)
  })

  it('formats date/time with provided locale and timezone', () => {
    const locale = 'fr-FR'
    const timeZone = 'Europe/Paris'
    const date = new Date('2024-02-03T10:15:00Z')
    const expected = new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date)

    expect(formatDateTime(date, { locale, timeZone })).toBe(expected)
  })

  it('formats clock time with provided locale and timezone', () => {
    const locale = 'ja-JP'
    const timeZone = 'Asia/Tokyo'
    const date = new Date('2024-05-10T00:00:00Z')
    const expected = new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }).format(date)

    expect(formatClockTime(date, { locale, timeZone })).toBe(expected)
  })
})
