import { parseAgentRules } from '~/lib/agents-rules/parser'
import type { SessionSnapshot } from '~/lib/sessions/model'

let cachedSnapshot: SessionSnapshot | null = null
let cachedRules: ReturnType<typeof parseAgentRules> | null = null

export async function loadSessionSnapshot(sessionId: string): Promise<SessionSnapshot> {
  if (cachedSnapshot) {
    return { ...cachedSnapshot, sessionId }
  }
  const fs = await import('node:fs/promises')
  const url = new URL('../../../tests/fixtures/session-large.json', import.meta.url)
  const file = await fs.readFile(url, 'utf8')
  const parsed = JSON.parse(file) as { meta: SessionSnapshot['meta']; events: SessionSnapshot['events'] }
  cachedSnapshot = {
    sessionId,
    meta: parsed.meta,
    events: parsed.events,
  }
  return cachedSnapshot
}

export async function loadAgentRules() {
  if (cachedRules) {
    return cachedRules
  }
  const fs = await import('node:fs/promises')
  const url = new URL('../../../tests/fixtures/agents/AGENTS.session-coach.md', import.meta.url)
  const file = await fs.readFile(url, 'utf8')
  cachedRules = parseAgentRules(file)
  return cachedRules
}
