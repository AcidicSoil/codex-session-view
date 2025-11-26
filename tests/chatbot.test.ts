import { describe, expect, it } from 'vitest'
import { parseAgentRules } from '~/lib/agents-rules/parser'
import { buildChatContext } from '~/features/chatbot/context-builder'
import { detectMisalignments } from '~/features/chatbot/misalignment-detector'
import type { SessionSnapshot } from '~/lib/sessions/model'
import sessionFixture from './fixtures/session-large.json'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const sessionSnapshot: SessionSnapshot = {
  sessionId: 'test-session',
  meta: sessionFixture.meta,
  events: sessionFixture.events,
}

const agentsMarkdown = readFileSync(resolve(process.cwd(), 'tests/fixtures/agents/sample.md'), 'utf8')
const agentRules = parseAgentRules(agentsMarkdown)

describe('Agent rule parser', () => {
  it('extracts headings and severity', () => {
    expect(agentRules.length).toBeGreaterThan(0)
    expect(agentRules[0].heading).toContain('Loader')
    expect(agentRules[0].severity).toBeTypeOf('string')
  })
})

describe('Chat context builder', () => {
  it('builds context within token budgets', () => {
    const context = buildChatContext({
      snapshot: sessionSnapshot,
      misalignments: [],
      history: [],
      agentRules,
      providerOverrides: { maxContextTokens: 4096, maxOutputTokens: 512 },
    })
    expect(context.sections.length).toBeGreaterThan(0)
    expect(context.usedTokens).toBeLessThanOrEqual(3584)
  })
})

describe('Misalignment detector', () => {
  it('flags fixture heuristics', () => {
    const detection = detectMisalignments({ snapshot: sessionSnapshot, agentRules })
    expect(detection.misalignments.length).toBeGreaterThanOrEqual(1)
  })
})
