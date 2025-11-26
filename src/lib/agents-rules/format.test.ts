import { describe, expect, it } from 'vitest'
import { truncateRuleTitle } from './format'

describe('truncateRuleTitle', () => {
  it('returns original title when below max length', () => {
    expect(truncateRuleTitle('Loader discipline', 70)).toBe('Loader discipline')
  })

  it('truncates and appends ellipsis when exceeding max', () => {
    const result = truncateRuleTitle('a'.repeat(120), 70)
    expect(result.endsWith('...')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(70)
  })

  it('is idempotent after truncation', () => {
    const once = truncateRuleTitle('b'.repeat(95), 70)
    const twice = truncateRuleTitle(once, 70)
    expect(twice).toBe(once)
  })
})
