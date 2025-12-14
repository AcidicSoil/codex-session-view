import { describe, expect, it } from 'vitest'
import { formatLogTimestamp } from '~/utils/log-timestamp'

describe('formatLogTimestamp', () => {
  it('returns friendly label with UTC suffix for Z timestamps', () => {
    const value = '2025-01-01T12:34:56Z'
    expect(formatLogTimestamp(value)).toBe('Jan 1, 2025 12:34 PM UTC')
  })

  it('preserves explicit offsets without conversion', () => {
    const value = '2025-08-15T09:05:00-0500'
    expect(formatLogTimestamp(value)).toBe('Aug 15, 2025 9:05 AM UTC-05:00')
  })

  it('supports clock-only formatting with offsets', () => {
    const value = '2025-11-01T23:45:00+0530'
    expect(formatLogTimestamp(value, { style: 'clock' })).toBe('11:45 PM UTC+05:30')
  })

  it('handles date-only inputs', () => {
    const value = '2025-03-10'
    expect(formatLogTimestamp(value)).toBe('Mar 10, 2025')
  })

  it('returns original string when parsing fails', () => {
    const value = 'not-a-timestamp'
    expect(formatLogTimestamp(value)).toBe('not-a-timestamp')
  })
})
