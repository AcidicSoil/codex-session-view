import { expect, test } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFile } from 'node:fs/promises'

function buildApiUrl(pathname: string) {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173'
  const url = new URL(base)
  url.pathname = pathname
  url.search = ''
  url.hash = ''
  return url.toString()
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const sessionFixture = path.resolve(__dirname, './fixtures/sample-session.jsonl')

async function seedSessionContext(request: APIRequestContext) {
  const filename = `playwright-e2e-${Date.now()}.jsonl`
  const content = await readFile(sessionFixture, 'utf8')
  const uploadResponse = await request.post(buildApiUrl('/api/uploads'), {
    data: { filename, content },
    headers: { 'content-type': 'application/json' },
  })
  expect(uploadResponse.status()).toBe(200)

  const bindResponse = await request.post(buildApiUrl('/api/session/repo-context'), {
    data: { action: 'set', sessionId: 'session-default', assetPath: `uploads/${filename}` },
    headers: { 'content-type': 'application/json' },
  })
  expect(bindResponse.status()).toBe(200)
}

test.describe('chatbot endpoints', () => {
  test.beforeEach(async ({ request }) => {
    await seedSessionContext(request)
  })

  test('analyze endpoint accepts session-mode payloads', async ({ request }) => {
    const response = await request.post(buildApiUrl('/api/chatbot/analyze'), {
      data: {
        sessionId: 'session-default',
        mode: 'session',
        analysisType: 'summary',
      },
      headers: {
        'content-type': 'application/json',
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(typeof payload.summaryMarkdown).toBe('string')
    expect(payload.summaryMarkdown).toContain('## Goals')
  })

  test('stream endpoint returns assistant text', async ({ request }) => {
    const response = await request.post(buildApiUrl('/api/chatbot/stream'), {
      data: {
        sessionId: 'session-default',
        mode: 'session',
        prompt: 'Summarize AGENT rules in one sentence.',
      },
      headers: {
        'content-type': 'application/json',
      },
    })

    if (response.status() === 503) {
      test.skip(true, 'LLM provider unavailable for streaming test')
    }

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body.length).toBeGreaterThan(0)
  })
})
