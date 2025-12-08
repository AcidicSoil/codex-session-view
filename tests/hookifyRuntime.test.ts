import { describe, expect, it } from 'vitest'
import { evaluateAddToChatContent } from '~/server/lib/hookifyRuntime'
import type { AgentRule } from '~/lib/agents-rules/parser'

const sampleRules: AgentRule[] = [
  {
    id: 'AGENT-001',
    heading: 'Dangerous commands',
    level: 2,
    summary: 'Never nuke the filesystem',
    body: 'rm -rf is forbidden',
    bullets: ['rm -rf /'],
    severity: 'high',
    keywords: ['rm -rf'],
  },
  {
    id: 'AGENT-010',
    heading: 'Debug logging',
    level: 2,
    summary: 'Avoid console.log spam',
    body: 'Keep production logs clean',
    bullets: ['console.log in prod'],
    severity: 'medium',
    keywords: ['console.log'],
  },
]

describe('hookify runtime', () => {
  it('allows prompts with no matches', () => {
    const result = evaluateAddToChatContent({
      sessionId: 'test',
      source: 'timeline',
      content: 'Summarize progress',
      agentRules: sampleRules,
    })
    expect(result.blocked).toBe(false)
    expect(result.prefill?.prompt).toContain('Summarize progress')
    expect(result.severity).toBe('none')
  })

  it('blocks high severity matches and annotates prompt', () => {
    const result = evaluateAddToChatContent({
      sessionId: 'test',
      source: 'timeline',
      content: 'Should I run rm -rf /tmp?',
      agentRules: sampleRules,
    })
    expect(result.blocked).toBe(true)
    expect(result.severity).toBe('high')
    expect(result.rules.length).toBeGreaterThan(0)
    expect(result.annotations).toContain('Hookify Alignment Notes')
  })

  it('warns for medium severity and prepends annotation markdown', () => {
    const result = evaluateAddToChatContent({
      sessionId: 'test',
      source: 'manual',
      content: 'Sprinkle console.log here',
      agentRules: [sampleRules[1]],
    })
    expect(result.blocked).toBe(false)
    expect(result.severity).toBe('medium')
    expect(result.prefill?.prompt.startsWith('## Hookify Alignment Notes')).toBe(true)
  })
})
