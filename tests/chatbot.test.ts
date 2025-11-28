import { describe, expect, it } from 'vitest'
import { parseAgentRules } from '~/lib/agents-rules/parser'
import { buildChatContext } from '~/features/chatbot/context-builder'
import { detectMisalignments } from '~/features/chatbot/misalignment-detector'
import type { MisalignmentRecord, SessionSnapshot } from '~/lib/sessions/model'
import sessionFixture from './fixtures/session-large.json'
import misalignmentSessionFixture from './fixtures/sessions/session.misalignment-basic.json'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { generateCommitMessages, generateSessionSummaryMarkdown, getChatModelOptions, resolveModelForMode } from '~/lib/ai/client'
import { buildAssistantEvidence } from '~/server/chatbot-api.server'
import type { ChatRemediationMetadata } from '~/lib/chatbot/types'

const sessionSnapshot: SessionSnapshot = {
  sessionId: 'test-session',
  meta: sessionFixture.meta,
  events: sessionFixture.events,
}

const misalignmentSnapshot: SessionSnapshot = {
  sessionId: 'session-misalignment-basic',
  meta: misalignmentSessionFixture.meta,
  events: misalignmentSessionFixture.events,
}

const agentsMarkdown = readFileSync(resolve(process.cwd(), 'tests/fixtures/agents/AGENTS.session-coach.md'), 'utf8')
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
    const detection = detectMisalignments({ snapshot: misalignmentSnapshot, agentRules })
    expect(detection.misalignments.length).toBeGreaterThanOrEqual(1)
  })
})

describe('Analysis helpers', () => {
  const detection = detectMisalignments({ snapshot: misalignmentSnapshot, agentRules })

  it('builds markdown with four required sections', () => {
    const markdown = generateSessionSummaryMarkdown({
      snapshot: misalignmentSnapshot,
      misalignments: detection.misalignments,
      recentEvents: misalignmentSnapshot.events,
      contextHeadings: ['Session metadata'],
    })
    expect(markdown).toContain('## Goals')
    expect(markdown).toContain('## Main changes')
    expect(markdown).toContain('## Issues')
    expect(markdown).toContain('## Follow-ups')
    const sections = markdown.split('\n## ').length
    expect(sections).toBeGreaterThanOrEqual(4)
  })

  it('returns commit subjects under 72 characters', () => {
    const commits = generateCommitMessages({
      snapshot: misalignmentSnapshot,
      misalignments: detection.misalignments,
      recentEvents: misalignmentSnapshot.events,
    })
    expect(commits.length).toBeGreaterThan(0)
    for (const subject of commits) {
      expect(subject.length).toBeLessThanOrEqual(72)
    }
  })
})

describe('Chat model registry', () => {
  it('lists session-safe models with metadata', () => {
    const models = getChatModelOptions('session')
    expect(models.length).toBeGreaterThan(0)
    expect(models[0]).toMatchObject({ id: expect.any(String), provider: expect.any(String) })
  })

  it('resolves defaults per mode when unset', () => {
    const modelId = resolveModelForMode('general')
    expect(typeof modelId).toBe('string')
    expect(modelId.length).toBeGreaterThan(0)
  })
})

describe('Assistant evidence mapping', () => {
  const sampleMisalignment: MisalignmentRecord = {
    id: 'mis-1',
    sessionId: 'demo-session',
    ruleId: 'AGENT-001',
    title: 'Sample',
    summary: 'Sample summary',
    severity: 'high',
    status: 'open',
    evidence: [
      {
        message: 'src/app.ts has TODO markers',
        eventIndex: 5,
        highlight: 'TODO: clean up',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  it('builds evidence when metadata references an existing misalignment', () => {
    const metadata: ChatRemediationMetadata = { misalignmentId: 'mis-1' }
    const evidence = buildAssistantEvidence(metadata, [sampleMisalignment])
    expect(evidence).toBeTruthy()
    expect(evidence?.[0]?.ruleId).toBe('AGENT-001')
    expect(evidence?.[0]?.severity).toBe('high')
    expect(evidence?.[0]?.snippet).toContain('TODO')
  })

  it('returns undefined when no metadata is provided', () => {
    const evidence = buildAssistantEvidence(undefined, [sampleMisalignment])
    expect(evidence).toBeUndefined()
  })
  describe('Dynamic Misalignment Detection', () => {
    // 1. Define a rule that forbids "magic sparkles"
    const MOCK_RULE_TEXT = `
# performance rules
* Avoid using magic sparkles in the render loop.
`;
    const rules = parseAgentRules(MOCK_RULE_TEXT);

    // 2. Create a session snapshot that VIOLATES this rule
    const badSnapshot: SessionSnapshot = {
      sessionId: 'test-dynamic-detection',
      meta: sessionFixture.meta,
      events: [
        {
          id: 'evt-1',
          type: 'Message',
          role: 'user',
          content: 'I am adding some magic sparkles to the component render function.',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    it('detects violations based on dynamic keywords', () => {
      const result = detectMisalignments({
        snapshot: badSnapshot,
        agentRules: rules,
      });

      // Should find 1 misalignment
      expect(result.misalignments.length).toBe(1);

      // Check details
      const record = result.misalignments[0];
      expect(record.ruleId).toContain('performance-rules'); // ID derived from heading
      expect(record.evidence[0].message).toContain('magic');
      expect(record.evidence[0].message).toContain('sparkles');
    });

    it('ignores events that do not match keywords', () => {
      const goodSnapshot: SessionSnapshot = {
        ...badSnapshot,
        events: [
          {
            id: 'evt-2',
            type: 'Message',
            role: 'user',
            content: 'I am optimizing the render loop with memoization.',
            createdAt: new Date().toISOString(),
          },
        ],
      };

      const result = detectMisalignments({
        snapshot: goodSnapshot,
        agentRules: rules,
      });

      expect(result.misalignments.length).toBe(0);
    });
  });
})
