import { expect, test } from '@playwright/test'

function buildApiUrl(pathname: string) {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3001/viewer'
  const url = new URL(base)
  url.pathname = pathname
  url.search = ''
  url.hash = ''
  return url.toString()
}

test.describe('chatbot endpoints', () => {
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
