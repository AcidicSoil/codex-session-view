import { describe, expect, it } from 'vitest'

import { findLastOffsetBeforeOrEqual } from './TimelineView'

describe('findLastOffsetBeforeOrEqual', () => {
  it('keeps the current row visible when the target is inside a tall item', () => {
    const offsets = [0, 800, 1200]
    expect(findLastOffsetBeforeOrEqual(offsets, 0)).toBe(0)
    expect(findLastOffsetBeforeOrEqual(offsets, 200)).toBe(0)
    expect(findLastOffsetBeforeOrEqual(offsets, 799)).toBe(0)
  })

  it('advances once the target moves past the tall item bottom', () => {
    const offsets = [0, 800, 1200]
    expect(findLastOffsetBeforeOrEqual(offsets, 800)).toBe(1)
    expect(findLastOffsetBeforeOrEqual(offsets, 1000)).toBe(1)
    expect(findLastOffsetBeforeOrEqual(offsets, 1600)).toBe(2)
  })

  it('handles empty offset arrays', () => {
    expect(findLastOffsetBeforeOrEqual([], 100)).toBe(-1)
  })
})
