import { describe, expect, it } from 'vitest'
import { buildJsonExport } from '~/features/viewer/export/formatters/json'
import { buildCsvExport } from '~/features/viewer/export/formatters/csv'
import { buildMarkdownExport } from '~/features/viewer/export/formatters/markdown'
import type { ExportBuildParams } from '~/features/viewer/export/types'

const sampleEvent = {
  type: 'Message',
  role: 'user',
  content: 'Hello world',
  at: '2024-01-01T00:00:00Z',
  id: 'evt-1',
} as const

function buildParams(overrides?: Partial<ExportBuildParams>): ExportBuildParams {
  return {
    scopeResult: {
      scope: 'entire',
      events: [sampleEvent as any],
      isPartial: false,
      label: 'Entire session',
    },
    options: { includeMetadata: false, includeTimestamps: true },
    filterDescription: null,
    sessionMeta: {
      id: 'sess-1',
      timestamp: '2024-01-01T00:00:00Z',
      instructions: 'SECRET',
    },
    exportedAt: new Date('2024-01-01T01:00:00Z'),
    ...overrides,
  }
}

describe('export formatters', () => {
  it('redacts instructions from JSON export', () => {
    const json = buildJsonExport(buildParams())
    const parsed = JSON.parse(json)
    expect(parsed.session.meta.instructions).toBeUndefined()
    expect(parsed.session.events[0].id).toBeUndefined()
  })

  it('escapes CSV cells and clears metadata when disabled', () => {
    const csv = buildCsvExport(buildParams())
    const [headerLine, rowLine] = csv.split('\n')
    expect(headerLine).toContain('Timestamp')
    expect(rowLine.split(',')[1]).toBe('') // Event ID stripped
    expect(rowLine).toContain('Hello world')
  })

  it('omits timestamps in markdown when option disabled', () => {
    const output = buildMarkdownExport(
      buildParams({
        options: { includeMetadata: false, includeTimestamps: false },
      }),
    )
    expect(output).not.toMatch(/👤 User\s+\(.+\)/)
  })
})
