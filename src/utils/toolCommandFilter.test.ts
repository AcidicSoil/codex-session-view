import { describe, it, expect } from 'vitest'
import type { ResponseItem } from '~/lib/viewer-types'
import { matchesCommandFilter, buildEventBadges } from '~/lib/session-events/toolMetadata'

describe('tool command filter', () => {
  const createEvent = (overrides: Partial<ResponseItem>): ResponseItem => ({
    type: 'LocalShellCall',
    command: 'rg src',
    stdout: 'src/components/viewer/Timeline.tsx',
    ...overrides,
  })

  it('matches command families when present', () => {
    const event = createEvent({ command: 'git status' })
    expect(matchesCommandFilter(event, { families: ['git'], query: '' })).toBe(true)
    expect(matchesCommandFilter(event, { families: ['rg'], query: '' })).toBe(false)
  })

  it('matches query text in command token or file names', () => {
    const event = createEvent({ command: 'rg src/components' })
    expect(matchesCommandFilter(event, { families: [], query: 'rg' })).toBe(true)
    expect(matchesCommandFilter(event, { families: [], query: 'Timeline.tsx' })).toBe(true)
    expect(matchesCommandFilter(event, { families: [], query: 'missing' })).toBe(false)
  })

  it('limits badges to command + single file', () => {
    const event = createEvent({ command: 'sed -n 1,10p tests/test.ts', stdout: 'tests/test.ts\nREADME.md' })
    const badges = buildEventBadges(event)
    expect(badges.filter((badge) => badge.type === 'file')).toHaveLength(1)
    const commandBadge = badges.find((badge) => badge.type === 'command')
    expect(commandBadge?.label).toBe('sed')
  })
})
