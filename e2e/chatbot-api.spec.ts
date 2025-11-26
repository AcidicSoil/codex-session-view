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
        sessionId: 'demo-session',
        mode: 'session',
        target: 'summary',
      },
      headers: {
        'content-type': 'application/json',
      },
    })

    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.status).toBe('ok')
    expect(typeof payload.markdown).toBe('string')
    expect(payload.markdown).toContain('Session summary')
  })

  test('stream endpoint returns assistant text', async ({ request }) => {
    const response = await request.post(buildApiUrl('/api/chatbot/stream'), {
      data: {
        sessionId: 'demo-session',
        mode: 'session',
        prompt: 'Summarize AGENT rules in one sentence.',
      },
      headers: {
        'content-type': 'application/json',
      },
    })

    expect(response.status()).toBe(200)
    const body = await response.text()
    expect(body).toContain('Session coach response')
    expect(body).toContain('Context sections')
  })
})
