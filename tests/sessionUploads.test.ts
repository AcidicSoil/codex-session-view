import { describe, expect, it, vi, beforeEach } from 'vitest'

describe('sessionUploads persistence', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('stores uploads in TanStack DB collection', async () => {
    const store = await import('~/server/persistence/sessionUploads')
    const record = await store.saveSessionUpload('example.json', '{"foo":1}')
    expect(record.url).toMatch(/\/api\/uploads\//)

    const list = await store.listSessionUploadRecords()
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(record.id)

    const content = await store.getSessionUploadContent(record.id)
    expect(content).toBe('{"foo":1}')
  })
})
