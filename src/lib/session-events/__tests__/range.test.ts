import { describe, expect, it } from 'vitest'
import { clampEventRange, sliceEventsByRange } from '../range'

const sampleEvents = Array.from({ length: 10 }).map((_, index) => ({ index }))

describe('clampEventRange', () => {
  it('returns default range when no overrides provided', () => {
    const result = clampEventRange(10, null)
    expect(result).toEqual({ startIndex: 0, endIndex: 9, totalEvents: 10, applied: false })
  })

  it('clamps values within bounds', () => {
    const result = clampEventRange(10, { startIndex: -5, endIndex: 40 })
    expect(result.startIndex).toBe(0)
    expect(result.endIndex).toBe(9)
    expect(result.applied).toBe(true)
  })

  it('swaps when start > end', () => {
    const result = clampEventRange(10, { startIndex: 8, endIndex: 2 })
    expect(result.startIndex).toBe(2)
    expect(result.endIndex).toBe(8)
  })
})

describe('sliceEventsByRange', () => {
  it('returns full list when not applied', () => {
    const result = sliceEventsByRange(sampleEvents, null)
    expect(result.events).toHaveLength(10)
    expect(result.range.applied).toBe(false)
  })

  it('filters events by resolved indexes', () => {
    const result = sliceEventsByRange(sampleEvents, { startIndex: 3, endIndex: 5 })
    expect(result.events).toHaveLength(3)
    expect(result.events[0].index).toBe(3)
    expect(result.events.at(-1)?.index).toBe(5)
  })
})
