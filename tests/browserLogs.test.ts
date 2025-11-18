import { describe, expect, it } from 'vitest'
import { readBrowserLogSnapshot } from '~/server/function/__server'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const testDir = dirname(fileURLToPath(import.meta.url))
const fixturesDir = resolve(testDir, 'fixtures/browser-logs')

describe('readBrowserLogSnapshot', () => {
  it('returns a helpful message when directory is missing', async () => {
    const snapshot = await readBrowserLogSnapshot(resolve(process.cwd(), 'non-existent-dir'))
    expect(snapshot.text).toMatch(/not found/i)
    expect(snapshot.source).toBeNull()
  })

  it('returns a helpful message when directory exists but has no log files', async () => {
    const dir = resolve(fixturesDir, 'empty-dir')
    const snapshot = await readBrowserLogSnapshot(dir)
    expect(snapshot.text).toMatch(/no browser logs/i)
    expect(snapshot.source).toBeNull()
  })

  it('reads the latest log file in a directory', async () => {
    const dir = resolve(fixturesDir, 'default')
    const snapshot = await readBrowserLogSnapshot(dir, 1000)
    expect(snapshot.source).toMatch(/dev-2024-05-01/)
    expect(snapshot.text).toContain('Second fixture log entry')
    expect(snapshot.truncated).toBe(false)
  })

  it('ignores non-log files and prefers newest log file', async () => {
    const dir = resolve(fixturesDir, 'multiple')
    const snapshot = await readBrowserLogSnapshot(dir)
    expect(snapshot.source).toMatch(/dev-2024-06-01/)
    expect(snapshot.text).toContain('Latest multi log entry')
    expect(snapshot.truncated).toBe(false)
  })

  it('returns a placeholder when a log file is empty', async () => {
    const dir = resolve(fixturesDir, 'empty-file')
    const snapshot = await readBrowserLogSnapshot(dir)
    expect(snapshot.text).toBe('(log file is empty)')
    expect(snapshot.source).toMatch(/dev-empty/)
    expect(snapshot.truncated).toBe(false)
  })

  it('truncates log output when over the limit', async () => {
    const dir = resolve(fixturesDir, 'default')
    const snapshot = await readBrowserLogSnapshot(dir, 50)
    expect(snapshot.truncated).toBe(true)
    expect(snapshot.text.length).toBeLessThanOrEqual(50)
    expect(snapshot.text).toContain('entry')
  })
})
