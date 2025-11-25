import { describe, expect, it } from 'vitest'
import {
  buildSearchMatchers,
  findHighlightRanges,
  matchesSearchMatchers,
} from '~/utils/search'

describe('search utils', () => {
  it('builds matchers for plain tokens', () => {
    const matchers = buildSearchMatchers('alpha beta')
    expect(matchers).toHaveLength(2)
    expect(matchers[0]).toMatchObject({ raw: 'alpha', isRegex: false })
    expect(matchers[1]).toMatchObject({ raw: 'beta', isRegex: false })
  })

  it('supports regex literals with flags', () => {
    const matchers = buildSearchMatchers('/foo.+/i gamma')
    expect(matchers[0]).toMatchObject({ raw: '/foo.+/i', isRegex: true })
    expect(matchers[1]).toMatchObject({ raw: 'gamma', isRegex: false })
  })

  it('matches text when every matcher passes', () => {
    const matchers = buildSearchMatchers('alpha beta')
    expect(matchesSearchMatchers('alpha-beta branch', matchers)).toBe(true)
    expect(matchesSearchMatchers('alpha only', matchers)).toBe(false)
  })

  it('finds highlight ranges merged and limited', () => {
    const matchers = buildSearchMatchers('alpha beta')
    const ranges = findHighlightRanges('alpha beta alpha', matchers)
    expect(ranges.length).toBeGreaterThan(0)
    expect(ranges[0]).toMatchObject({ start: 0 })
  })
})

